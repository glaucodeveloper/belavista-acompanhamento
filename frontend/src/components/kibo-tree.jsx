import React, { createContext, useContext, useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, File, Folder, FolderOpen } from 'lucide-react';

const TreeContext = createContext(null);
const NodeContext = createContext(null);

export function TreeProvider({ children, defaultExpandedIds = [], className = '' }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set(defaultExpandedIds));
  const toggleExpanded = id => setExpandedIds(current => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  return <TreeContext.Provider value={{ expandedIds, toggleExpanded }}><motion.div className={`kibo-tree ${className}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>{children}</motion.div></TreeContext.Provider>;
}

export function TreeView({ children, className = '', ...props }) {
  return <div role="tree" className={`kibo-tree-view ${className}`} {...props}>{children}</div>;
}

export function TreeNode({ nodeId, level = 0, children, className = '', ...props }) {
  const generatedId = useId();
  return <NodeContext.Provider value={{ nodeId: nodeId || generatedId, level }}><div className={`kibo-tree-node ${className}`} {...props}>{children}</div></NodeContext.Provider>;
}

export function TreeNodeTrigger({ children, hasChildren = false, onSelect, className = '', ...props }) {
  const tree = useContext(TreeContext);
  const node = useContext(NodeContext);
  const expanded = tree.expandedIds.has(node.nodeId);
  return <button type="button" role="treeitem" aria-expanded={hasChildren ? expanded : undefined} className={`kibo-tree-trigger ${className}`} style={{ '--tree-level': node.level }} onClick={event => { if (hasChildren) tree.toggleExpanded(node.nodeId); else onSelect?.(event); }} {...props}>
    <TreeExpander hasChildren={hasChildren} />
    <TreeIcon hasChildren={hasChildren} expanded={expanded} />
    {children}
  </button>;
}

export function TreeExpander({ hasChildren = false }) {
  const tree = useContext(TreeContext);
  const node = useContext(NodeContext);
  if (!hasChildren) return <span className="kibo-tree-spacer" aria-hidden="true" />;
  return <span className="kibo-tree-expander" aria-hidden="true"><ChevronRight size={15} className={tree.expandedIds.has(node.nodeId) ? 'is-expanded' : ''} /></span>;
}

export function TreeIcon({ hasChildren = false, expanded = false, icon }) {
  return <span className="kibo-tree-icon" aria-hidden="true">{icon || (hasChildren ? (expanded ? <FolderOpen size={16} /> : <Folder size={16} />) : <File size={15} />)}</span>;
}

export function TreeLabel({ children, className = '', ...props }) {
  return <span className={`kibo-tree-label ${className}`} {...props}>{children}</span>;
}

export function TreeNodeContent({ children, className = '', ...props }) {
  const tree = useContext(TreeContext);
  const node = useContext(NodeContext);
  const expanded = tree.expandedIds.has(node.nodeId);
  return <AnimatePresence initial={false}>{expanded && <motion.div role="group" className={`kibo-tree-content ${className}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .18 }} {...props}>{children}</motion.div>}</AnimatePresence>;
}
