// Composable Kibo UI Tree API adapted to this Vite app's plain CSS setup.
// Reference implementation: https://www.kibo-ui.com/components/tree
import React, { createContext, useCallback, useContext, useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, File, Folder, FolderOpen } from 'lucide-react';

const TreeContext = createContext(null);
const NodeContext = createContext(null);

function useTree() {
  const value = useContext(TreeContext);
  if (!value) throw new Error('Kibo Tree components need a TreeProvider.');
  return value;
}

function useNode() {
  const value = useContext(NodeContext);
  if (!value) throw new Error('Kibo Tree node elements need a TreeNode.');
  return value;
}

export function TreeProvider({ children, defaultExpandedIds = [], selectedIds, onSelectionChange, selectable = true, showLines = true, showIcons = true, indent = 20, animateExpand = true, className = '' }) {
  const [expandedIds, setExpandedIds] = useState(() => new Set(defaultExpandedIds));
  const [internalSelection, setInternalSelection] = useState(selectedIds || []);
  const controlled = selectedIds !== undefined && onSelectionChange !== undefined;
  const selection = controlled ? selectedIds : internalSelection;
  const toggleExpanded = useCallback(id => setExpandedIds(current => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  }), []);
  const handleSelection = useCallback((id, event) => {
    if (!selectable) return;
    const next = selection.includes(id) ? [] : [id];
    if (controlled) onSelectionChange?.(next);
    else setInternalSelection(next);
  }, [controlled, onSelectionChange, selectable, selection]);
  return <TreeContext.Provider value={{ expandedIds, selection, toggleExpanded, handleSelection, showLines, showIcons, indent, animateExpand }}><motion.div className={`kibo-tree ${className}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .2 }}>{children}</motion.div></TreeContext.Provider>;
}

export function TreeView({ children, className = '', ...props }) { return <div className={`kibo-tree-view ${className}`} {...props}>{children}</div>; }

export function TreeNode({ nodeId: providedId, level = 0, isLast = false, parentPath = [], children, className = '', ...props }) {
  const generated = useId();
  const nodeId = providedId || generated;
  const path = level ? [...parentPath.slice(0, level - 1), isLast] : [];
  return <NodeContext.Provider value={{ nodeId, level, isLast, parentPath: path }}><div className={`kibo-tree-node ${className}`} {...props}>{children}</div></NodeContext.Provider>;
}

export function TreeNodeTrigger({ children, className = '', onClick, ...props }) {
  const tree = useTree(), node = useNode();
  return <motion.div className={`kibo-tree-trigger ${tree.selection.includes(node.nodeId) ? 'is-selected' : ''} ${className}`} style={{ paddingLeft: node.level * tree.indent + 8 }} onClick={event => { tree.toggleExpanded(node.nodeId); tree.handleSelection(node.nodeId, event); onClick?.(event); }} whileTap={{ scale: .99 }} {...props}>{tree.showLines && <TreeLines />}{children}</motion.div>;
}

export function TreeExpander({ hasChildren = false, className = '' }) {
  const { expandedIds, toggleExpanded } = useTree(), { nodeId } = useNode();
  if (!hasChildren) return <span className="kibo-tree-expander is-empty" aria-hidden="true" />;
  const expanded = expandedIds.has(nodeId);
  return <motion.button type="button" className={`kibo-tree-expander ${className}`} aria-label={expanded ? 'Recolher' : 'Expandir'} aria-expanded={expanded} animate={{ rotate: expanded ? 90 : 0 }} onClick={event => { event.stopPropagation(); toggleExpanded(nodeId); }}><ChevronRight size={14} /></motion.button>;
}

export function TreeIcon({ icon, hasChildren = false, className = '' }) {
  const { showIcons, expandedIds } = useTree(), { nodeId } = useNode();
  if (!showIcons) return null;
  const value = icon || (hasChildren ? (expandedIds.has(nodeId) ? <FolderOpen size={15} /> : <Folder size={15} />) : <File size={15} />);
  return <span className={`kibo-tree-icon ${className}`}>{value}</span>;
}

export function TreeLabel({ children, className = '' }) { return <span className={`kibo-tree-label ${className}`}>{children}</span>; }

export function TreeLines() {
  const { showLines, indent } = useTree(), node = useNode();
  if (!showLines || !node.level) return null;
  return <span className="kibo-tree-lines" aria-hidden="true" style={{ '--tree-indent': `${indent}px`, '--tree-level': node.level }} />;
}

export function TreeNodeContent({ children, hasChildren = false, className = '', ...props }) {
  const { expandedIds, animateExpand } = useTree(), { nodeId } = useNode();
  return <AnimatePresence initial={false}>{hasChildren && expandedIds.has(nodeId) && <motion.div className={`kibo-tree-content ${className}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: animateExpand ? .18 : 0 }} {...props}>{children}</motion.div>}</AnimatePresence>;
}
