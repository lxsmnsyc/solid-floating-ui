import type { FloatingNodeType, ReferenceType } from '../types';

export function getNodeChildren<RT extends ReferenceType = ReferenceType>(
  nodes: FloatingNodeType<RT>[],
  id: string | undefined,
  onlyOpenChildren = true,
): FloatingNodeType<RT>[] {
  const directChildren = nodes.filter(
    (node) => node.parentId === id && (!onlyOpenChildren || node.context?.open),
  );
  return directChildren.flatMap((child) => [
    child,
    ...getNodeChildren(nodes, child.id, onlyOpenChildren),
  ]);
}

export function getDeepestNode<RT extends ReferenceType = ReferenceType>(
  nodes: FloatingNodeType<RT>[],
  id: string | undefined,
): FloatingNodeType<RT> | undefined {
  let deepestNodeId: string | undefined;
  let maxDepth = -1;

  function findDeepest(nodeId: string | undefined, depth: number): void {
    if (depth > maxDepth) {
      deepestNodeId = nodeId;
      maxDepth = depth;
    }

    const children = getNodeChildren(nodes, nodeId);

    children.forEach((child) => {
      findDeepest(child.id, depth + 1);
    });
  }

  findDeepest(id, 0);

  return nodes.find((node) => node.id === deepestNodeId);
}

export function getNodeAncestors<RT extends ReferenceType = ReferenceType>(
  nodes: FloatingNodeType<RT>[],
  id: string | undefined,
): FloatingNodeType<RT>[] {
  let allAncestors: FloatingNodeType<RT>[] = [];
  let currentParentId = nodes.find((node) => node.id === id)?.parentId;

  while (currentParentId) {
    const parentId = currentParentId;
    const currentNode = nodes.find((node) => node.id === parentId);
    currentParentId = currentNode?.parentId;

    if (currentNode) {
      allAncestors = allAncestors.concat(currentNode);
    }
  }

  return allAncestors;
}
