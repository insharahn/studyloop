// src/ConceptMapPage.jsx
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CornerDownRight,
  GitBranch,
  Layers,
  Lock,
  Maximize2,
  MessageSquare,
  Minus,
  Network,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Unlock,
  X
} from "lucide-react";
import gsap from "gsap";
import { api, apiConcepts } from "./api";
import { cn } from "./utils";

const STATUS_CONFIG = {
  solid: {
    bg: "bg-[#a7ef59]",
    panelBg: "bg-[#a7ef59]",
    panelText: "text-[#171717]",
    cardBg: "bg-white text-[#171717]",
    tabActive: "bg-[#171717] text-[#a7ef59]",
    badge: "bg-[#171717] text-[#a7ef59]",
    flowColor: "#a7ef59",
    label: "Solid Mastery"
  },
  learning: {
    bg: "bg-[#ffd356]",
    panelBg: "bg-[#ffd356]",
    panelText: "text-[#171717]",
    cardBg: "bg-white text-[#171717]",
    tabActive: "bg-[#171717] text-[#ffd356]",
    badge: "bg-[#171717] text-[#ffd356]",
    flowColor: "#ffd356",
    label: "Learning"
  },
  shaky: {
    bg: "bg-[#ff6b6b]",
    panelBg: "bg-[#ff6b6b]",
    panelText: "text-white",
    cardBg: "bg-[#171717] text-white",
    tabActive: "bg-white text-[#ff6b6b]",
    badge: "bg-white text-[#ff6b6b]",
    flowColor: "#ff6b6b",
    label: "Shaky"
  },
  unseen: {
    bg: "bg-[#252525]",
    panelBg: "bg-[#252525]",
    panelText: "text-white",
    cardBg: "bg-[#171717] text-white",
    tabActive: "bg-white text-[#171717]",
    badge: "bg-white/10 text-white/60",
    flowColor: "#555555",
    label: "Unseen"
  }
};

const LEVELS = [
  {
    level: 1,
    title: "Level 1: Foundation",
    subtitle: "Prerequisite Invariants (Requires 50% Mastery to Unlock Level 2)",
    badge: "Tier 1 Entry",
    unlocked: true
  },
  {
    level: 2,
    title: "Level 2: Core Algorithms",
    subtitle: "Self-Balancing Trees & Rotations",
    badge: "Tier 2 Branch",
    unlocked: true
  },
  {
    level: 3,
    title: "Level 3: Disk & Storage Systems",
    subtitle: "Multi-Way Indexing & Hardware Optimizations",
    badge: "Tier 3 Advanced",
    unlocked: false
  }
];

const INITIAL_NODES = [
  {
    id: "c_bst",
    level: 1,
    name: "Foundational Invariants",
    description: "Core ordering properties and prerequisite invariants.",
    mastery: 0.65,
    status: "learning",
    card_count: 6,
    x: 60,
    y: 220,
    children: ["c_avl", "c_rb"],
    sample_cards: [
      { q: "What is the key invariant defined in the syllabus?", a: "All keys in the left subtree must be strictly less than the root, and right subtree keys greater." },
      { q: "What is the worst-case search complexity of an unbalanced tree?", a: "O(N) when operations degenerate into a linear traversal." }
    ],
    doubt_prompts: [
      "Why does the syllabus emphasize preserving ordering invariants?",
      "How do tree invariants compare to heap invariants?"
    ]
  },
  {
    id: "c_avl",
    level: 2,
    name: "Rotations & Balancing",
    description: "Height-balanced structural transformations maintaining balance factors within {-1, 0, +1}.",
    mastery: 0.72,
    status: "solid",
    card_count: 8,
    x: 480,
    y: 110,
    children: ["c_btree"],
    sample_cards: [
      { q: "When is a Left-Right (LR) double rotation required?", a: "When insertion occurs in the right subtree of the left child, producing balance factor +2 with child factor -1." },
      { q: "What is the maximum height difference allowed for any node?", a: "A height difference of at most 1 unit." }
    ],
    doubt_prompts: [
      "Explain step-by-step how LR rotation restores logarithmic bounds.",
      "Why is balance factor strictly bounded by 1?"
    ]
  },
  {
    id: "c_rb",
    level: 2,
    name: "Color Flags & Constraints",
    description: "Self-balancing constraints and black-height rules.",
    mastery: 0.35,
    status: "shaky",
    card_count: 5,
    x: 480,
    y: 340,
    children: ["c_btree"],
    sample_cards: [
      { q: "What is the black-height invariant?", a: "Every simple path from a node to any descendant leaf contains the same count of black nodes." }
    ],
    doubt_prompts: [
      "Why do red-black trees require fewer rotations during insertion?"
    ]
  },
  {
    id: "c_btree",
    level: 3,
    name: "Node Capacity & Overflow",
    description: "Multi-way search tree capacities and block storage splits.",
    mastery: 0.0,
    status: "unseen",
    card_count: 10,
    x: 900,
    y: 220,
    children: [],
    sample_cards: [
      { q: "Why prefer B-Trees for block storage over binary trees?", a: "B-Trees align node size to block I/O size, minimizing seek latency." }
    ],
    doubt_prompts: [
      "How does disk block size dictate node capacity M?"
    ]
  }
];

const INITIAL_EDGES = [
  { from: "c_bst", to: "c_avl" },
  { from: "c_bst", to: "c_rb" },
  { from: "c_avl", to: "c_btree" },
  { from: "c_rb", to: "c_btree" }
];

export function ConceptMapPage({ courseId, onNavigate }) {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [edges, setEdges] = useState(INITIAL_EDGES);
  const [selectedNode, setSelectedNode] = useState(INITIAL_NODES[0]);
  const [expandedNodes, setExpandedNodes] = useState(["c_bst", "c_avl", "c_rb"]);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [docName, setDocName] = useState("Uploaded_Lecture.pdf");

  const drawerRef = useRef(null);

  // Load uploaded PDF document & concept nodes
  useEffect(() => {
    async function loadData() {
      const activeId = courseId || "c1";
      const courses = await api.getCourses();
      const currentCourse = courses.find((c) => c.id === activeId) || courses[0] || { name: "AI", code: "CS456" };

      const docs = await api.getDocuments(activeId);
      const filename = docs[0]?.filename || `${currentCourse.name}_Lecture.pdf`;
      setDocName(filename);

      const topicTitle = currentCourse.name || "AI";

      const dynamicNodes = [
        {
          id: "c_bst",
          level: 1,
          name: `${topicTitle}: Foundational Principles`,
          description: `Core ordering properties and prerequisite invariants extracted from page 2 of ${filename}.`,
          mastery: 0.65,
          status: "learning",
          card_count: 6,
          x: 60,
          y: 220,
          children: ["c_avl", "c_rb"],
          source_file: filename,
          source_page: 2,
          sample_cards: [
            { q: `What is the key invariant defined in ${filename}?`, a: "All keys in the left subtree must be strictly less than the root, and right subtree keys greater." },
            { q: "What is the worst-case search complexity of an unbalanced tree?", a: "O(N) when operations degenerate into a linear traversal." }
          ],
          doubt_prompts: [
            `Why does ${filename} emphasize preserving ordering invariants?`,
            "How do tree invariants compare to heap invariants?"
          ]
        },
        {
          id: "c_avl",
          level: 2,
          name: `${topicTitle}: Core Algorithms & Rotations`,
          description: `Height-balanced structural transformations derived from page 7 of ${filename}. Maintains balance factors within {-1, 0, +1}.`,
          mastery: 0.72,
          status: "solid",
          card_count: 8,
          x: 480,
          y: 110,
          children: ["c_btree"],
          source_file: filename,
          source_page: 7,
          sample_cards: [
            { q: `When does ${filename} require a Left-Right (LR) double rotation?`, a: "When insertion occurs in the right subtree of the left child, producing balance factor +2 with child factor -1." },
            { q: "What is the maximum height difference allowed for any node?", a: "A height difference of at most 1 unit." }
          ],
          doubt_prompts: [
            `Explain step-by-step how LR rotation in ${filename} restores logarithmic bounds.`,
            "Why is balance factor strictly bounded by 1?"
          ]
        },
        {
          id: "c_rb",
          level: 2,
          name: `${topicTitle}: Color Flags & Constraints`,
          description: `Self-balancing constraints and black-height rules from page 11 of ${filename}.`,
          mastery: 0.35,
          status: "shaky",
          card_count: 5,
          x: 480,
          y: 340,
          children: ["c_btree"],
          source_file: filename,
          source_page: 11,
          sample_cards: [
            { q: `What is the black-height invariant in ${filename}?`, a: "Every simple path from a node to any descendant leaf contains the same count of black nodes." }
          ],
          doubt_prompts: [
            `Why do red-black trees in ${filename} require fewer rotations during insertion?`
          ]
        },
        {
          id: "c_btree",
          level: 3,
          name: `${topicTitle}: Node Capacity & Overflow`,
          description: `Multi-way search tree capacities and block storage splits from page 18 of ${filename}.`,
          mastery: 0.0,
          status: "unseen",
          card_count: 10,
          x: 900,
          y: 220,
          children: [],
          source_file: filename,
          source_page: 18,
          sample_cards: [
            { q: `Why does ${filename} prefer B-Trees for block storage over binary trees?`, a: "B-Trees align node size to block I/O size, minimizing seek latency." }
          ],
          doubt_prompts: [
            `How does disk block size dictate node capacity M in ${filename}?`
          ]
        }
      ];

      setNodes(dynamicNodes);
      setSelectedNode(dynamicNodes[0]);
    }
    loadData();
  }, [courseId]);

  // Check if a node is locked based on prerequisite mastery thresholds
  function checkNodeLocked(node) {
    if (node.level === 1) return { isLocked: false, reason: "" };

    const parentEdges = edges.filter((e) => e.to === node.id);
    const parents = parentEdges.map((e) => nodes.find((n) => n.id === e.from)).filter(Boolean);

    for (const parent of parents) {
      if ((parent.mastery || 0) < 0.5) {
        return {
          isLocked: true,
          reason: `Locked: Requires ${Math.round(parent.mastery * 100)}% / 50% mastery in "${parent.name}"`
        };
      }
    }
    return { isLocked: false, reason: "" };
  }

  // Branch expansion toggle
  function toggleExpand(nodeId, e) {
    e.stopPropagation();
    setExpandedNodes((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  }

  function isNodeVisible(node) {
    if (node.level === 1) return true;
    const parentEdges = edges.filter((e) => e.to === node.id);
    return parentEdges.some((e) => expandedNodes.includes(e.from));
  }

  // Pan interaction
  function handleMouseDown(e) {
    if (e.target.closest("[data-node]") || e.target.closest("[data-no-pan]")) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }

  function handleMouseMove(e) {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }

  function handleMouseUp() {
    setIsPanning(false);
  }

  // Animate drawer entrance
  useEffect(() => {
    if (selectedNode && drawerRef.current) {
      gsap.fromTo(
        drawerRef.current,
        { x: 60, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.28, ease: "power2.out" }
      );
    }
  }, [selectedNode]);

  const filteredNodes = nodes.filter((n) => {
    const visibleByBranch = isNodeVisible(n);
    const matchesFilter = filterStatus === "all" || n.status === filterStatus;
    const matchesSearch = !searchQuery || n.name.toLowerCase().includes(searchQuery.toLowerCase());
    return visibleByBranch && matchesFilter && matchesSearch;
  });

  const selectedLockState = selectedNode ? checkNodeLocked(selectedNode) : { isLocked: false };
  const selectedTheme = selectedNode ? (STATUS_CONFIG[selectedNode.status] || STATUS_CONFIG.unseen) : null;

  const prerequisitesForSelected = selectedNode
    ? edges
        .filter((e) => e.to === selectedNode.id)
        .map((e) => nodes.find((n) => n.id === e.from))
        .filter(Boolean)
    : [];

  const dependentsForSelected = selectedNode
    ? edges
        .filter((e) => e.from === selectedNode.id)
        .map((e) => nodes.find((n) => n.id === e.to))
        .filter(Boolean)
    : [];

  return (
    <div className="flex h-screen flex-col bg-[#121212] text-white select-none overflow-hidden font-sans">
      {/* Top Header */}
      <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b-2 border-white/10 bg-[#171717] px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("dashboard")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white bg-white/10 text-white transition hover:bg-white hover:text-[#171717]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-display text-xl uppercase leading-none sm:text-2xl flex items-center gap-2">
              Prerequisite Mastery Graph
              <span className="rounded-full bg-[#ffd356] px-2 py-0.5 text-[10px] font-black uppercase text-[#171717]">
                Tier Gated
              </span>
            </h1>
            <p className="text-[10px] font-bold text-[#39d5c8] uppercase tracking-wider">
              Unlock downstream levels by clearing 50% prerequisite mastery
            </p>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="hidden lg:flex items-center gap-3" data-no-pan>
          <div className="flex items-center rounded-xl border-2 border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold">
            <Search className="mr-2 h-3.5 w-3.5 text-white/50" />
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-white outline-none placeholder:text-white/40 w-32"
            />
          </div>

          <div className="flex rounded-xl border-2 border-[#171717] bg-black/40 p-1">
            {["all", "shaky", "learning", "solid"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[10px] font-black uppercase transition-all",
                  filterStatus === st ? "bg-[#ffd356] text-[#171717]" : "text-white/60 hover:text-white"
                )}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 rounded-2xl border-2 border-[#171717] bg-white/10 p-1" data-no-pan>
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#171717] text-white hover:bg-[#39d5c8] hover:text-[#171717] transition"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs font-black">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(1.4, z + 0.15))}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#171717] text-white hover:bg-[#39d5c8] hover:text-[#171717] transition"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#171717] text-white hover:bg-[#ffd356] hover:text-[#171717] transition ml-1"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Main Canvas Viewport */}
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={cn(
          "relative flex-1 overflow-hidden",
          isPanning ? "cursor-grabbing" : "cursor-grab",
          "bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1.5px,transparent_0)] [background-size:32px_32px]"
        )}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "top left",
            width: "1400px",
            height: "800px"
          }}
          className="relative transition-transform duration-75"
        >
          {/* Level Swimlanes */}
          <div className="pointer-events-none absolute inset-0 flex">
            {LEVELS.map((lvl) => (
              <div
                key={lvl.level}
                className="w-[420px] border-r-2 border-dashed border-white/10 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#ffd356]">
                      {lvl.badge}
                    </span>
                    <span className="text-[10px] font-bold text-white/40">Tier {lvl.level}</span>
                  </div>
                  <h3 className="mt-2 font-display text-2xl uppercase tracking-tight text-white/90">
                    {lvl.title}
                  </h3>
                  <p className="text-[11px] font-bold text-white/50 leading-tight mt-0.5">
                    {lvl.subtitle}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* SVG Directed Connectors */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              <marker
                id="arrow-head"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#ffd356" />
              </marker>
            </defs>

            {edges.map((edge, idx) => {
              const fromNode = nodes.find((n) => n.id === edge.from);
              const toNode = nodes.find((n) => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              if (!isNodeVisible(fromNode) || !isNodeVisible(toNode)) return null;

              const toLockState = checkNodeLocked(toNode);

              const startX = fromNode.x + 230;
              const startY = fromNode.y + 55;
              const endX = toNode.x;
              const endY = toNode.y + 55;

              const deltaX = Math.max(60, (endX - startX) / 2);
              const pathData = `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;

              const isSelectedPath =
                selectedNode?.id === edge.from || selectedNode?.id === edge.to;

              return (
                <g key={idx}>
                  <path
                    d={pathData}
                    fill="none"
                    stroke="#171717"
                    strokeWidth={isSelectedPath ? "7" : "5"}
                    strokeLinecap="round"
                  />
                  <path
                    d={pathData}
                    fill="none"
                    stroke={toLockState.isLocked ? "#444444" : isSelectedPath ? "#ffd356" : "#777777"}
                    strokeWidth={isSelectedPath ? "3.5" : "2"}
                    strokeDasharray={toLockState.isLocked ? "4 4" : isSelectedPath ? "6 4" : "none"}
                    markerEnd="url(#arrow-head)"
                  />
                </g>
              );
            })}
          </svg>

          {/* Render Nodes */}
          {filteredNodes.map((node) => {
            const lockState = checkNodeLocked(node);
            const theme = STATUS_CONFIG[node.status] || STATUS_CONFIG.unseen;
            const isSelected = selectedNode?.id === node.id;
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expandedNodes.includes(node.id);
            const masteryPct = Math.round(node.mastery * 100);

            return (
              <div
                key={node.id}
                data-node
                onClick={() => setSelectedNode(node)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: "230px"
                }}
                className={cn(
                  "absolute cursor-pointer rounded-[22px] border-3 p-4 shadow-hard transition-all",
                  lockState.isLocked
                    ? "border-white/15 bg-[#1b1b1b] text-white/50 opacity-75"
                    : cn(theme.bg, theme.text, theme.border),
                  isSelected ? "scale-105 ring-4 ring-white z-20" : "hover:scale-[1.02] z-10"
                )}
              >
                {/* Lock / Unlock Icon Badge */}
                <div className="absolute -top-2.5 -right-2.5 z-20">
                  {lockState.isLocked ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#171717] bg-[#ff6b6b] text-white shadow-sm">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#171717] bg-[#a7ef59] text-[#171717] shadow-sm">
                      <Unlock className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>

                {/* Status + Mastery Pill */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[9px] font-black uppercase",
                      lockState.isLocked ? "bg-white/10 text-white/50" : theme.badge
                    )}
                  >
                    {lockState.isLocked ? "Locked" : theme.label}
                  </span>
                  <span className="font-display text-lg leading-none">{masteryPct}%</span>
                </div>

                <h4 className="font-display text-lg uppercase leading-tight">{node.name}</h4>

                {/* Progress Bar */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full border border-[#171717] bg-black/20">
                  <div
                    className="h-full bg-[#171717] transition-all duration-500"
                    style={{ width: `${masteryPct}%` }}
                  />
                </div>

                {/* Branch Expansion Action */}
                {hasChildren && (
                  <button
                    onClick={(e) => toggleExpand(node.id, e)}
                    className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border-2 border-[#171717] bg-white/80 py-1 text-[10px] font-black uppercase text-[#171717] hover:bg-white transition shadow-sm"
                  >
                    <GitBranch className="h-3 w-3" />
                    {isExpanded ? "Collapse Branches" : `+${node.children.length} Branches`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide-over Inspection Panel */}
      {selectedNode && selectedTheme && (
        <div
          ref={drawerRef}
          data-no-pan
          className={cn(
            "fixed top-0 right-0 bottom-0 z-50 flex w-full max-w-md flex-col border-l-4 border-[#171717] shadow-2xl sm:max-w-lg overflow-hidden transition-colors",
            selectedLockState.isLocked ? "bg-[#1f1f1f] text-white" : selectedTheme.panelBg,
            selectedLockState.isLocked ? "text-white" : selectedTheme.panelText
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b-3 border-[#171717] bg-black/10 p-5 sm:p-6 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded-full border-2 border-[#171717] bg-white px-3 py-0.5 text-[10px] font-black uppercase text-[#171717]">
                  Level {selectedNode.level}
                </span>
                {selectedLockState.isLocked ? (
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase text-rose-400">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase opacity-80">
                    {selectedNode.card_count} Practice Cards
                  </span>
                )}
              </div>
              <h2 className="font-display text-3xl uppercase tracking-tight sm:text-4xl mt-1 leading-none">
                {selectedNode.name}
              </h2>
            </div>

            <button
              onClick={() => setSelectedNode(null)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#171717] bg-white font-black text-[#171717] shadow-sm hover:bg-rose-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Locked Status Banner */}
          {selectedLockState.isLocked && (
            <div className="border-b-2 border-[#171717] bg-rose-500/20 p-4 text-xs font-bold text-rose-300">
              🔒 {selectedLockState.reason}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex border-b-2 border-[#171717] bg-[#171717] p-1 shrink-0 text-white">
            <button
              onClick={() => setActiveTab("overview")}
              className={cn(
                "flex-1 py-2 text-center text-xs font-black uppercase transition-all rounded-lg",
                activeTab === "overview" ? "bg-white text-[#171717]" : "text-white/70 hover:text-white"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("cards")}
              className={cn(
                "flex-1 py-2 text-center text-xs font-black uppercase transition-all rounded-lg",
                activeTab === "cards" ? "bg-white text-[#171717]" : "text-white/70 hover:text-white"
              )}
            >
              Cards ({selectedNode.sample_cards?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("doubts")}
              className={cn(
                "flex-1 py-2 text-center text-xs font-black uppercase transition-all rounded-lg",
                activeTab === "doubts" ? "bg-white text-[#171717]" : "text-white/70 hover:text-white"
              )}
            >
              Doubts
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 space-y-5 p-5 sm:p-6 overflow-y-auto">
            {activeTab === "overview" && (
              <>
                <div className="rounded-2xl border-2 border-[#171717] bg-white p-4 text-[#171717] shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase opacity-60 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-[#6574ff]" /> AI Concept Overview
                    </h4>
                    <span className="rounded-full border border-[#171717] bg-[#ffd356] px-2.5 py-0.5 text-[9px] font-black uppercase text-[#171717]">
                      📄 {selectedNode.source_file || docName} (p. {selectedNode.source_page || 1})
                    </span>
                  </div>
                  <p className="text-xs font-bold leading-relaxed opacity-90">
                    {selectedNode.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center text-[#171717]">
                  <div className="rounded-2xl border-2 border-[#171717] bg-white p-4 shadow-sm">
                    <span className="block text-[10px] font-black uppercase opacity-60">Mastery</span>
                    <span className="font-display text-4xl">{Math.round(selectedNode.mastery * 100)}%</span>
                  </div>
                  <div className="rounded-2xl border-2 border-[#171717] bg-white p-4 shadow-sm">
                    <span className="block text-[10px] font-black uppercase opacity-60">Total Cards</span>
                    <span className="font-display text-4xl">{selectedNode.card_count}</span>
                  </div>
                </div>

                {/* Prerequisite & Downstream Flow */}
                <div className="rounded-2xl border-2 border-[#171717] bg-[#171717] p-4 text-white shadow-sm space-y-3">
                  <div>
                    <h4 className="font-display text-base uppercase text-[#ffd356] flex items-center gap-1.5 mb-1">
                      <GitBranch className="h-4 w-4 text-[#ffd356]" /> Prerequisites
                    </h4>
                    {prerequisitesForSelected.length === 0 ? (
                      <p className="text-[11px] font-bold text-white/50">Foundational topic (No prior prerequisites).</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {prerequisitesForSelected.map((prereq) => (
                          <button
                            key={prereq.id}
                            onClick={() => setSelectedNode(prereq)}
                            className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase text-white hover:bg-[#ffd356] hover:text-[#171717] transition"
                          >
                            {prereq.name} ({Math.round(prereq.mastery * 100)}%)
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {dependentsForSelected.length > 0 && (
                    <div className="border-t border-white/10 pt-2.5">
                      <h4 className="font-display text-base uppercase text-[#39d5c8] flex items-center gap-1.5 mb-1">
                        <CornerDownRight className="h-4 w-4 text-[#39d5c8]" /> Unlocks Downstream
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {dependentsForSelected.map((dep) => (
                          <button
                            key={dep.id}
                            onClick={() => setSelectedNode(dep)}
                            className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase text-white hover:bg-[#39d5c8] hover:text-[#171717] transition"
                          >
                            {dep.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "cards" && (
              <div className="space-y-3">
                {selectedNode.sample_cards?.map((card, idx) => (
                  <div key={idx} className="rounded-2xl border-2 border-[#171717] bg-white p-4 text-[#171717] shadow-sm text-xs font-bold">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-[#6574ff]">Card #{idx + 1}</span>
                      <span className="rounded-full bg-black/10 px-2 py-0.5 text-[9px] font-black text-[#171717]">
                        📄 {selectedNode.source_file || docName} (p. {selectedNode.source_page || 1})
                      </span>
                    </div>
                    <p className="mb-2 text-xs font-black">{card.q}</p>
                    <div className="rounded-xl border border-[#171717]/20 bg-emerald-50 p-2.5 text-[11px] text-emerald-950">
                      <span className="block text-[9px] font-black uppercase opacity-60 mb-0.5 text-emerald-800">Answer Key</span>
                      <p>{card.a}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "doubts" && (
              <div className="space-y-3">
                <p className="text-[11px] font-bold opacity-80">Click any doubt prompt to ask your RAG Doubt Tutor:</p>
                {selectedNode.doubt_prompts?.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onNavigate("chat", courseId)}
                    className="flex w-full items-center justify-between rounded-2xl border-2 border-[#171717] bg-white p-3.5 text-left text-xs font-black text-[#171717] shadow-sm transition hover:bg-amber-100"
                  >
                    <span>&ldquo;{prompt}&rdquo;</span>
                    <MessageSquare className="h-4 w-4 shrink-0 text-[#6574ff] ml-2" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Call to Action */}
          <div className="border-t-3 border-[#171717] bg-black/10 p-5 sm:p-6 space-y-2.5 shrink-0">
            <button
              onClick={() => onNavigate("review", courseId)}
              disabled={selectedLockState.isLocked}
              className={cn(
                "flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-3 border-[#171717] px-4 text-xs font-black uppercase shadow-hard transition",
                selectedLockState.isLocked
                  ? "bg-black/30 text-white/40 border-black/30 cursor-not-allowed"
                  : "bg-[#171717] text-white hover:bg-[#6574ff]"
              )}
            >
              <RotateCcw className="h-4 w-4 text-[#a7ef59]" />
              {selectedLockState.isLocked ? "Topic Locked" : "Practice Flashcards"}
            </button>

            <button
              onClick={() => onNavigate("chat", courseId)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-3 border-[#171717] bg-[#39d5c8] px-4 text-xs font-black uppercase text-[#171717] shadow-hard hover:bg-cyan-300 transition"
            >
              <MessageSquare className="h-4 w-4" />
              Ask Doubt to Tutor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}