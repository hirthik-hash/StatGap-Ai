"""Repository for Competency Knowledge Graph and Ontology hierarchy operations."""
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.orm import Session, joinedload
from backend.app.models.knowledge_graph import CompetencyNode, CompetencyRelationship, VALID_RELATIONSHIP_TYPES


class CompetencyGraphRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_node_by_id(self, node_id: str) -> Optional[CompetencyNode]:
        return (
            self.db.query(CompetencyNode)
            .options(
                joinedload(CompetencyNode.children),
                joinedload(CompetencyNode.outgoing_relationships),
                joinedload(CompetencyNode.incoming_relationships),
            )
            .filter(CompetencyNode.id == node_id)
            .first()
        )

    def get_node_by_code(self, code: str) -> Optional[CompetencyNode]:
        return self.db.query(CompetencyNode).filter(CompetencyNode.code == code).first()

    def list_nodes_by_level(self, ontology_level: str) -> List[CompetencyNode]:
        return (
            self.db.query(CompetencyNode)
            .filter(CompetencyNode.ontology_level == ontology_level, CompetencyNode.active == True)
            .all()
        )

    def list_all_nodes(self) -> List[CompetencyNode]:
        return (
            self.db.query(CompetencyNode)
            .filter(CompetencyNode.active == True)
            .order_by(CompetencyNode.ontology_level.asc(), CompetencyNode.name.asc())
            .all()
        )

    def get_children(self, node_id: str) -> List[CompetencyNode]:
        """Returns direct sub-skills or children in the ontology hierarchy."""
        return (
            self.db.query(CompetencyNode)
            .filter(CompetencyNode.parent_id == node_id, CompetencyNode.active == True)
            .all()
        )

    def get_prerequisites(self, node_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves prerequisites for a target node.
        Looks up relationships of type 'prerequisite', 'requires', or 'depends_on'.
        """
        rels = (
            self.db.query(CompetencyRelationship)
            .options(joinedload(CompetencyRelationship.source_node))
            .filter(
                CompetencyRelationship.target_node_id == node_id,
                CompetencyRelationship.relationship_type.in_([
                    "prerequisite", "requires", "PREREQUISITE", "REQUIRES"
                ]),
            )
            .all()
        )
        results = []
        for r in rels:
            if r.source_node:
                results.append({
                    "id": r.source_node.id,
                    "code": r.source_node.code,
                    "name": r.source_node.name,
                    "level": r.source_node.level,
                    "relationship_type": r.relationship_type,
                    "weight": r.weight,
                    "description": r.description,
                })
        return results

    def get_dependencies(self, node_id: str) -> List[Dict[str, Any]]:
        """
        Retrieves outgoing dependencies for a node.
        """
        rels = (
            self.db.query(CompetencyRelationship)
            .options(joinedload(CompetencyRelationship.target_node))
            .filter(
                CompetencyRelationship.source_node_id == node_id,
                CompetencyRelationship.relationship_type.in_([
                    "depends_on", "requires", "prerequisite", "DEPENDS_ON", "REQUIRES", "PREREQUISITE"
                ]),
            )
            .all()
        )
        results = []
        for r in rels:
            if r.target_node:
                results.append({
                    "id": r.target_node.id,
                    "code": r.target_node.code,
                    "name": r.target_node.name,
                    "level": r.target_node.level,
                    "relationship_type": r.relationship_type,
                    "weight": r.weight,
                    "description": r.description,
                })
        return results

    def would_cause_cycle(self, source_id: str, target_id: str, rel_type: str) -> bool:
        """
        Cycle prevention for directed acyclic graph (DAG) dependency edges.
        Checks if adding directed edge source_id -> target_id creates a cycle.
        If target_id can already reach source_id via existing dependency edges, then
        adding source_id -> target_id would create a cycle.
        """
        directed_types = [
            "prerequisite", "requires", "depends_on",
            "PREREQUISITE", "REQUIRES", "DEPENDS_ON",
        ]
        if rel_type not in directed_types:
            return False

        if source_id == target_id:
            return True

        visited: Set[str] = set()
        queue: List[str] = [target_id]

        while queue:
            current = queue.pop(0)
            if current == source_id:
                return True
            if current in visited:
                continue
            visited.add(current)

            # Query outgoing edges from current
            outgoing = (
                self.db.query(CompetencyRelationship.target_node_id)
                .filter(
                    CompetencyRelationship.source_node_id == current,
                    CompetencyRelationship.relationship_type.in_(directed_types),
                )
                .all()
            )
            for (nxt,) in outgoing:
                if nxt not in visited:
                    queue.append(nxt)

        return False

    def detect_cycle(self, source_id: str, target_id: str, rel_type: str = "requires") -> bool:
        """Convenience alias for would_cause_cycle."""
        return self.would_cause_cycle(source_id, target_id, rel_type)

    def add_relationship(
        self,
        source_id: str,
        target_id: str,
        rel_type: str,
        weight: float = 1.0,
        description: Optional[str] = None,
    ) -> CompetencyRelationship:
        """Adds a graph relationship with cycle validation."""
        if rel_type not in VALID_RELATIONSHIP_TYPES:
            raise ValueError(f"Invalid relationship type '{rel_type}'")

        if self.would_cause_cycle(source_id, target_id, rel_type):
            raise ValueError(
                f"Circular dependency rejected: Edge ({source_id} -> {target_id}, {rel_type}) "
                "would induce an invalid cycle in the competency graph."
            )

        rel = CompetencyRelationship(
            source_node_id=source_id,
            target_node_id=target_id,
            relationship_type=rel_type,
            weight=weight,
            description=description,
        )
        self.db.add(rel)
        self.db.commit()
        self.db.refresh(rel)
        return rel

    def get_full_ontology_hierarchy(self) -> List[Dict[str, Any]]:
        """
        Constructs canonical 4-level competency hierarchy:
        Cadre -> Function -> Competency -> Sub-skill.
        """
        all_nodes = self.list_all_nodes()
        nodes_by_id = {n.id: n for n in all_nodes}

        # Root nodes have no parent_id or are level='cadre'
        root_nodes = [n for n in all_nodes if n.ontology_level == "cadre" or not n.parent_id]

        def build_tree(node: CompetencyNode) -> Dict[str, Any]:
            children = [nodes_by_id[c.id] for c in node.children if c.id in nodes_by_id]
            return {
                "id": node.id,
                "code": node.code,
                "name": node.name,
                "description": node.description,
                "level": node.level,
                "ontology_level": node.ontology_level,
                "domain": node.domain,
                "required_proficiency": node.required_proficiency,
                "version": node.version,
                "children": [build_tree(c) for c in children],
            }

        return [build_tree(r) for r in root_nodes]
