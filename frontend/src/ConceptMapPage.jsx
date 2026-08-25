// src/ConceptMapPage.jsx
import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CornerDownRight,
  Eye,
  EyeOff,
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
    progressBg: "bg-[#171717]",
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
    progressBg: "bg-[#171717]",
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
    progressBg: "bg-white",
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
    progressBg: "bg-[#39d5c8]",
    flowColor: "#555555",
    label: "Unseen"
  }
};

const UNLOCKED_PALETTE = [
  { bg: "bg-[#ffd356]", panelBg: "bg-[#ffd356]", text: "text-[#171717]", panelText: "text-[#171717]", border: "border-[#171717]", progressBg: "bg-[#171717]" },
  { bg: "bg-[#39d5c8]", panelBg: "bg-[#39d5c8]", text: "text-[#171717]", panelText: "text-[#171717]", border: "border-[#171717]", progressBg: "bg-[#171717]" },
  { bg: "bg-[#a7ef59]", panelBg: "bg-[#a7ef59]", text: "text-[#171717]", panelText: "text-[#171717]", border: "border-[#171717]", progressBg: "bg-[#171717]" },
  { bg: "bg-[#6574ff]", panelBg: "bg-[#6574ff]", text: "text-white",     panelText: "text-white",     border: "border-[#171717]", progressBg: "bg-white" },
  { bg: "bg-[#ff57ce]", panelBg: "bg-[#ff57ce]", text: "text-white",     panelText: "text-white",     border: "border-[#171717]", progressBg: "bg-white" },
  { bg: "bg-[#ff9f43]", panelBg: "bg-[#ff9f43]", text: "text-[#171717]", panelText: "text-[#171717]", border: "border-[#171717]", progressBg: "bg-[#171717]" },
  { bg: "bg-[#a29bfe]", panelBg: "bg-[#a29bfe]", text: "text-[#171717]", panelText: "text-[#171717]", border: "border-[#171717]", progressBg: "bg-[#171717]" },
  { bg: "bg-[#00cec9]", panelBg: "bg-[#00cec9]", text: "text-[#171717]", panelText: "text-[#171717]", border: "border-[#171717]", progressBg: "bg-[#171717]" },
];

const LEVELS = [
  {
    level: 1,
    title: "Tier 1: Foundational Concepts",
    subtitle: "Prerequisite Fundamentals (50% Mastery unlocks Tier 2)",
    badge: "Foundations",
    unlocked: true
  },
  {
    level: 2,
    title: "Tier 2: Core Topics & Methods",
    subtitle: "Key Functions, Operations & Primary Topics",
    badge: "Core Topics",
    unlocked: true
  },
  {
    level: 3,
    title: "Tier 3: Advanced Applications",
    subtitle: "Complex Syntheses & High-Level Integration",
    badge: "Advanced",
    unlocked: true
  }
];



function buildGraphLayout(rawConcepts, filename) {
  if (!rawConcepts || !rawConcepts.length) return null;

  const idMap = new Map(rawConcepts.map((c) => [c.id, c]));
  const levels = new Map();

  function getDepth(id, visited = new Set()) {
    if (visited.has(id)) return 1;
    if (levels.has(id)) return levels.get(id);
    visited.add(id);

    const concept = idMap.get(id);
    if (!concept || !concept.prerequisites || !concept.prerequisites.length) {
      levels.set(id, 1);
      return 1;
    }

    let maxPrereqDepth = 0;
    for (const pId of concept.prerequisites) {
      maxPrereqDepth = Math.max(maxPrereqDepth, getDepth(pId, new Set(visited)));
    }
    const depth = Math.min(maxPrereqDepth + 1, 3);
    levels.set(id, depth);
    return depth;
  }

  rawConcepts.forEach((c) => getDepth(c.id));

  const byLevel = { 1: [], 2: [], 3: [] };
  rawConcepts.forEach((c) => {
    const lvl = levels.get(c.id) || 1;
    byLevel[lvl].push(c);
  });

  const childrenMap = new Map();
  const formattedEdges = [];

  rawConcepts.forEach((c) => {
    (c.prerequisites || []).forEach((pId) => {
      if (idMap.has(pId)) {
        formattedEdges.push({ from: pId, to: c.id });
        if (!childrenMap.has(pId)) childrenMap.set(pId, []);
        childrenMap.get(pId).push(c.id);
      }
    });
  });

  const xByLevel = { 1: 60, 2: 480, 3: 900 };
  const formattedNodes = [];

  [1, 2, 3].forEach((lvl) => {
    const levelConcepts = byLevel[lvl];
    const total = levelConcepts.length;
    const VERTICAL_PITCH = 230;
    levelConcepts.forEach((c, idx) => {
      const y = total === 1 ? 260 : 170 + idx * VERTICAL_PITCH;
      const sampleCards = (c.sample_cards || c.cards || []).map((card) => ({
        q: card.q || card.question || "Practice Question",
        a: card.a || card.answer || "Answer Key",
        source_file: filename,
        source_page: card.source_page || c.source_page || 1
      }));

      formattedNodes.push({
        id: c.id,
        level: lvl,
        name: c.name,
        description: c.description || `Concept extracted from ${filename}.`,
        mastery: c.mastery ?? 0,
        status: c.status || "unseen",
        card_count: sampleCards.length || c.card_count || 0,
        x: xByLevel[lvl],
        y: Math.round(y),
        children: childrenMap.get(c.id) || [],
        source_file: filename,
        source_page: c.source_page || 1,
        sample_cards: sampleCards,
        doubt_prompts: [
          `Explain "${c.name}" as discussed in ${filename}`,
          c.description
            ? `How is "${c.name}" (${c.description}) explained in ${filename}?`
            : `What are the key principles of "${c.name}" in ${filename}?`
        ]
      });
    });
  });

  return { nodes: formattedNodes, edges: formattedEdges };
}

export function ConceptMapPage({ courseId, onNavigate }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCourseId, setActiveCourseId] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [revealedCards, setRevealedCards] = useState({});
  const [expandedNodes, setExpandedNodes] = useState([]);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  function toggleRevealCard(cardKey) {
    setRevealedCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey]
    }));
  }
  const [activeTab, setActiveTab] = useState("overview");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [docName, setDocName] = useState("Uploaded_Lecture.pdf");

  const drawerRef = useRef(null);

  // Load uploaded PDF document & concept nodes from backend API
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str || "");
      const courses = await api.getCourses();
      const validPassedId = (courseId && isUUID(courseId) && courses.some((c) => c.id === courseId)) ? courseId : null;
      const activeId = validPassedId || courses[0]?.id || "";
      setActiveCourseId(activeId);
      const currentCourse = courses.find((c) => c.id === activeId) || courses[0] || { name: "Course", code: "" };

      let docs = [];
      try {
        if (activeId && isUUID(activeId)) {
          docs = await api.getDocuments(activeId);
        }
      } catch (err) {
        console.warn("Could not fetch documents:", err);
      }
      const filename = docs[0]?.filename || `${currentCourse.name}_Lecture.pdf`;
      setDocName(filename);

      try {
        if (activeId && isUUID(activeId)) {
          const fetchedConcepts = await apiConcepts.getConcepts(activeId);
          if (fetchedConcepts && fetchedConcepts.length > 0) {
            const graphData = buildGraphLayout(fetchedConcepts, filename);
            if (graphData && graphData.nodes.length > 0) {
              setNodes(graphData.nodes);
              setEdges(graphData.edges);
              setExpandedNodes(graphData.nodes.map((n) => n.id));
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn("Failed to fetch real concept graph:", err);
      }

      setNodes([]);
      setEdges([]);
      setLoading(false);
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

  function clampPan(newX, newY) {
    const container = document.getElementById("canvas-viewport");
    const viewportWidth = container ? container.clientWidth : (typeof window !== "undefined" ? window.innerWidth : 360);
    const viewportHeight = container ? container.clientHeight : 800;
    const canvasWidth = 1200 * zoom;

    const maxNodeY = nodes && nodes.length ? Math.max(...nodes.map((n) => n.y)) : 600;
    const canvasHeight = Math.max(900, maxNodeY + 350) * zoom;

    const minX = Math.min(0, viewportWidth - canvasWidth);
    const minY = Math.min(0, viewportHeight - canvasHeight);

    const clampedX = Math.min(0, Math.max(minX, newX));
    const clampedY = Math.min(0, Math.max(minY, newY));

    return { x: clampedX, y: clampedY };
  }

  // Pan interaction
  function handleMouseDown(e) {
    if (e.target.closest("[data-node]") || e.target.closest("[data-no-pan]")) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }

  function handleMouseMove(e) {
    if (!isPanning) return;
    const rawX = e.clientX - panStart.x;
    const rawY = e.clientY - panStart.y;
    setPan(clampPan(rawX, rawY));
  }

  function handleMouseUp() {
    setIsPanning(false);
  }

  function handleTouchStart(e) {
    if (!e.touches || e.touches.length !== 1) return;
    const touch = e.touches[0];
    if (touch.target.closest("[data-node]") || touch.target.closest("[data-no-pan]")) return;
    setIsPanning(true);
    setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
  }

  function handleTouchMove(e) {
    if (!isPanning || !e.touches || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rawX = touch.clientX - panStart.x;
    const rawY = touch.clientY - panStart.y;
    setPan(clampPan(rawX, rawY));
  }

  function handleTouchEnd() {
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
  const selectedNodeIndex = selectedNode ? filteredNodes.findIndex((n) => n.id === selectedNode.id) : -1;
  const selectedUnlockedTheme = selectedNodeIndex >= 0 ? UNLOCKED_PALETTE[selectedNodeIndex % UNLOCKED_PALETTE.length] : UNLOCKED_PALETTE[0];
  const selectedTheme = selectedNode
    ? (selectedLockState.isLocked
        ? { panelBg: "bg-[#1b1b1b]", panelText: "text-white" }
        : (STATUS_CONFIG[selectedNode.status] && selectedNode.status !== "unseen" ? STATUS_CONFIG[selectedNode.status] : selectedUnlockedTheme))
    : null;

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
            <h1 className="font-display text-xl uppercase leading-none sm:text-2xl">
              Concept Map
            </h1>
            <p className="text-[10px] font-bold text-[#39d5c8] uppercase tracking-wider">
              Visual Prerequisite Knowledge Graph
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
        id="canvas-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={cn(
          "relative flex-1 overflow-hidden touch-pan-x touch-pan-y",
          isPanning ? "cursor-grabbing" : "cursor-grab",
          "bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1.5px,transparent_0)] [background-size:32px_32px]"
        )}
      >
        {loading ? (
          <div className="flex h-full w-full min-h-[500px] flex-col items-center justify-center gap-3 text-center p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-3 border-[#171717] bg-[#ffd356] text-[#171717] shadow-hard animate-pulse">
              <GitBranch className="h-7 w-7" />
            </div>
            <h3 className="font-display text-2xl uppercase tracking-tight text-white">Loading Knowledge Graph...</h3>
            <p className="text-xs font-bold text-white/60">Fetching concept nodes and prerequisite relationships</p>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex h-full w-full min-h-[500px] flex-col items-center justify-center gap-4 text-center p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-3 border-[#171717] bg-[#39d5c8] text-[#171717] shadow-hard">
              <GitBranch className="h-8 w-8" />
            </div>
            <h3 className="font-display text-2xl uppercase tracking-tight text-white">No Concepts Extracted Yet</h3>
            <p className="text-xs font-bold text-white/60 max-w-sm">
              Upload PDF lecture notes or slides to auto-extract your interactive prerequisite graph.
            </p>
            <button
              onClick={() => onNavigate && onNavigate("upload", courseId)}
              className="mt-2 flex items-center gap-2 rounded-xl border-3 border-[#171717] bg-[#ffd356] px-5 py-2.5 text-xs font-black uppercase text-[#171717] shadow-hard hover:bg-amber-300 transition active:translate-y-0.5"
            >
              Upload Lecture Notes
            </button>
          </div>
        ) : (
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "top left",
              width: "1200px",
              minWidth: "1200px",
              maxWidth: "1200px",
              minHeight: `${Math.max(900, (nodes && nodes.length ? Math.max(...nodes.map((n) => n.y)) + 300 : 900))}px`
            }}
            className="relative transition-transform duration-75"
          >
            {/* Level Swimlanes */}
            <div className="pointer-events-none absolute inset-0 flex">
              {LEVELS.map((lvl) => (
                <div
                  key={lvl.level}
                  className="w-[400px] border-r-2 border-dashed border-white/10 flex flex-col justify-between"
                >
                  <div className="h-[140px] p-5 border-b-2 border-dashed border-white/10 bg-[#171717]/60 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-[10px] font-black uppercase text-[#ffd356]">
                        {lvl.badge}
                      </span>
                      <span className="text-[10px] font-bold text-white/40">Tier {lvl.level}</span>
                    </div>
                    <h3 className="mt-1.5 font-display text-2xl uppercase tracking-tight text-white/90">
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
            {filteredNodes.map((node, nodeIdx) => {
              const lockState = checkNodeLocked(node);
              const unlockedTheme = UNLOCKED_PALETTE[nodeIdx % UNLOCKED_PALETTE.length];
              const theme = lockState.isLocked
                ? { bg: "bg-[#1b1b1b]", text: "text-white/50", border: "border-white/15", progressBg: "bg-white/20" }
                : (STATUS_CONFIG[node.status] && node.status !== "unseen" ? STATUS_CONFIG[node.status] : unlockedTheme);

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
                      : cn(theme.bg, theme.text, theme.border || "border-[#171717]"),
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

                  {/* Topic Title */}
                  <div className="mb-2 pr-2">
                    <span className="text-[9px] font-black uppercase opacity-60">
                      Tier {node.level} Concept
                    </span>
                    <h4 className="font-display text-lg uppercase leading-tight tracking-tight line-clamp-2">
                      {node.name}
                    </h4>
                  </div>

                  {/* Description */}
                  <p className="mb-3 text-[10px] font-bold opacity-80 line-clamp-2 leading-snug">
                    {node.description}
                  </p>

                  {/* Mastery Progress Bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-[9px] font-black uppercase mb-1">
                      <span>Mastery</span>
                      <span>{masteryPct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full border border-[#171717] bg-black/20">
                      <div
                        className={cn("h-full transition-all duration-300", theme.progressBg)}
                        style={{ width: `${masteryPct}%` }}
                      />
                    </div>
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
        )}
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
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-[10px] font-black uppercase opacity-70 flex items-center gap-1 shrink-0 whitespace-nowrap">
                      <Sparkles className="h-3.5 w-3.5 text-[#6574ff]" /> AI Concept Overview
                    </h4>
                    <span
                      title={`${selectedNode.source_file || docName} (p. ${selectedNode.source_page || 1})`}
                      className="inline-flex max-w-full items-center gap-1 rounded-xl border-2 border-[#171717] bg-[#ffd356] px-2.5 py-1 text-[10px] font-black uppercase text-[#171717] shadow-xs"
                    >
                      <span className="truncate max-w-[130px] sm:max-w-[170px]">
                        📄 {selectedNode.source_file || docName}
                      </span>
                      <span className="shrink-0 opacity-80">(p. {selectedNode.source_page || 1})</span>
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
                {selectedLockState.isLocked ? (
                  <div className="rounded-2xl border-3 border-[#171717] bg-[#ff6b6b]/20 p-5 text-center text-xs font-bold text-white shadow-sm">
                    <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#171717] bg-[#ff6b6b] text-white">
                      <Lock className="h-5 w-5" />
                    </div>
                    <h4 className="font-display text-lg uppercase tracking-tight text-[#ff6b6b] mb-1">
                      Flashcards Locked
                    </h4>
                    <p className="opacity-90 leading-relaxed text-[11px]">
                      {selectedLockState.reason || "Unlock prerequisite concepts to practice flashcards for this topic."}
                    </p>
                  </div>
                ) : (!selectedNode.sample_cards || selectedNode.sample_cards.length === 0) ? (
                  <div className="rounded-2xl border-2 border-black/20 bg-black/10 p-5 text-center text-xs font-bold">
                    <p className="mb-3 opacity-80">No flashcards linked to this concept yet.</p>
                    <button
                      onClick={() => onNavigate && onNavigate("review", activeCourseId || courseId)}
                      className="rounded-xl border-2 border-[#171717] bg-[#a7ef59] px-4 py-2 text-[10px] font-black uppercase text-[#171717] shadow-sm hover:bg-lime-300 transition"
                    >
                      Practice Course Cards
                    </button>
                  </div>
                ) : (
                  selectedNode.sample_cards.map((card, idx) => {
                    const cardKey = card.id || `card_${selectedNode.id}_${idx}`;
                    const isRevealed = !!revealedCards[cardKey];

                    return (
                      <div key={idx} className="rounded-2xl border-2 border-[#171717] bg-white p-4 text-[#171717] shadow-sm text-xs font-bold">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-[#6574ff]">Card #{idx + 1}</span>
                          <span className="rounded-full bg-black/10 px-2 py-0.5 text-[9px] font-black text-[#171717]">
                            📄 {card.source_file || selectedNode.source_file || docName} (p. {card.source_page || selectedNode.source_page || 1})
                          </span>
                        </div>
                        <p className="mb-3 text-xs font-black leading-snug">{card.q}</p>

                        {isRevealed ? (
                          <div className="rounded-xl border border-[#171717]/20 bg-emerald-50 p-3 text-[11px] text-emerald-950">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-black uppercase opacity-60 text-emerald-800">Answer Key</span>
                              <button
                                onClick={() => toggleRevealCard(cardKey)}
                                className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700 hover:underline"
                              >
                                <EyeOff className="h-3 w-3" /> Hide Answer
                              </button>
                            </div>
                            <p className="leading-relaxed">{card.a}</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => toggleRevealCard(cardKey)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-[#171717] bg-[#39d5c8] py-2 text-[10px] font-black uppercase text-[#171717] hover:bg-cyan-300 transition shadow-sm"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Reveal Answer
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "doubts" && (
              <div className="space-y-3">
                {selectedLockState.isLocked ? (
                  <div className="rounded-2xl border-3 border-[#171717] bg-[#ff6b6b]/20 p-5 text-center text-xs font-bold text-white shadow-sm">
                    <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#171717] bg-[#ff6b6b] text-white">
                      <Lock className="h-5 w-5" />
                    </div>
                    <h4 className="font-display text-lg uppercase tracking-tight text-[#ff6b6b] mb-1">
                      Doubts & RAG Tutor Locked
                    </h4>
                    <p className="opacity-90 leading-relaxed text-[11px]">
                      {selectedLockState.reason || "Unlock prerequisite concepts to ask doubts about this topic."}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] font-bold opacity-80">Click any doubt prompt to ask your RAG Doubt Tutor:</p>
                    {selectedNode.doubt_prompts?.map((prompt, idx) => (
                      <button
                        key={idx}
                        onClick={() => onNavigate("chat", activeCourseId || courseId, { prompt })}
                        className="flex w-full items-center justify-between rounded-2xl border-2 border-[#171717] bg-white p-3.5 text-left text-xs font-black text-[#171717] shadow-sm transition hover:bg-amber-100"
                      >
                        <span>&ldquo;{prompt}&rdquo;</span>
                        <MessageSquare className="h-4 w-4 shrink-0 text-[#6574ff] ml-2" />
                      </button>
                    ))}
                  </>
                )}
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
                  : "bg-[#a7ef59] text-[#171717] hover:bg-lime-300"
              )}
            >
              <RotateCcw className="h-4 w-4 text-[#171717]" />
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