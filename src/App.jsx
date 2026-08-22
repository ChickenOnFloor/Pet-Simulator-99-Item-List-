import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Copy,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowUpDown,
  Sun,
  Moon,
} from "lucide-react";
import itemsList from "./constants/itemList";
import sellerItemsList from "./constants/itemSellerList";

const ITEM_BASES = {
  normal: itemsList,
  seller: sellerItemsList,
};

const BASE_OPTIONS = [
  { value: "normal", label: "Normal item list" },
  { value: "seller", label: "Seller item list" },
];

const CATEGORIES = [
  "Pet",
  "Misc",
  "Card",
  "Egg",
  "Consumable",
  "Hoverboard",
  "Booth",
  "Lootbox",
  "Charm",
  "Potion",
  "Tool",
  "Ultimate",
  "Enchant",
  "Tower",
  "Fruit",
  "XPPotion",
  "Box",
  "Seed",
];

const BADGE_PALETTE = [
  { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-300", ring: "ring-teal-600/20 dark:ring-teal-300/20" },
  { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-300", ring: "ring-amber-600/20 dark:ring-amber-300/20" },
  { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-300", ring: "ring-indigo-600/20 dark:ring-indigo-300/20" },
  { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-300", ring: "ring-rose-600/20 dark:ring-rose-300/20" },
  { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-300", ring: "ring-cyan-600/20 dark:ring-cyan-300/20" },
  { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-300", ring: "ring-violet-600/20 dark:ring-violet-300/20" },
  { bg: "bg-lime-500/10", text: "text-lime-600 dark:text-lime-300", ring: "ring-lime-600/20 dark:ring-lime-300/20" },
  { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-300", ring: "ring-orange-600/20 dark:ring-orange-300/20" },
];

function badgeStyle(cls) {
  const idx = CATEGORIES.indexOf(cls);
  const i = idx === -1 ? cls.length % BADGE_PALETTE.length : idx % BADGE_PALETTE.length;
  return BADGE_PALETTE[i];
}

function parsePrice(raw) {
  if (!raw) return 0;
  const match = String(raw).trim().match(/^([\d,.]+)\s*([a-zA-Z]*)$/);
  if (!match) return 0;
  const num = parseFloat(match[1].replace(/,/g, "")) || 0;
  const suffix = match[2].toLowerCase();
  const mult = { k: 1e3, m: 1e6, b: 1e9, t: 1e12, q: 1e15 }[suffix] || 1;
  return num * mult;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

function buildCopyText(item, baseKey, includeClass) {
  const priceKey = baseKey === "seller" ? "Price" : "MaxPrice";
  const nameKey = baseKey === "seller" ? "name" : "Name";
  const priceValue = item.maxPrice ?? item.Price ?? "1m";

  return includeClass
    ? `{${nameKey} = "${item.name}", Class="${item.class}", ${priceKey} = "${priceValue}"}`
    : `{${nameKey} = "${item.name}", ${priceKey} = "${priceValue}"}`;
}

export default function PetItemManager() {
  const [baseKey, setBaseKey] = useState("normal");
  const items = useMemo(() => {
    const source = ITEM_BASES[baseKey] ?? ITEM_BASES.normal;
    return source.map((it) => ({
      id: genId(),
      ...it,
      maxPrice: it.maxPrice ?? it.Price ?? "1m",
    }));
  }, [baseKey]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name-asc");
  const [page, setPage] = useState(1);
  const [dark, setDark] = useState(true);
  const perPage = 8;


  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const filtered = useMemo(() => {
    let list = items.filter((it) => {
      const matchesSearch = it.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === "all" || it.class === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "price-desc":
          return parsePrice(b.maxPrice) - parsePrice(a.maxPrice);
        case "price-asc":
          return parsePrice(a.maxPrice) - parsePrice(b.maxPrice);
        default:
          return 0;
      }
    });
    return list;
  }, [items, search, categoryFilter, sortKey]);

  const duplicateNames = useMemo(() => {
    const counts = {};
    items.forEach((it) => {
      counts[it.name] = (counts[it.name] || 0) + 1;
    });
    return new Set(Object.entries(counts).filter(([, count]) => count > 1).map(([name]) => name));
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  useEffect(() => setPage(1), [baseKey, search, categoryFilter, sortKey]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const copyItem = (item) => {
    const hasDuplicates = duplicateNames.has(item.name);
    const text = buildCopyText(item, baseKey, hasDuplicates);

    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  };

  const copyAll = () => {
    const text = filtered
      .map((it) => buildCopyText(it, baseKey, duplicateNames.has(it.name)))
      .join(",\n");

    navigator.clipboard.writeText(text);
    showToast(`Copied ${filtered.length} item${filtered.length === 1 ? "" : "s"}`);
  };

  

  return (
    <>
      <div className="min-h-screen w-full bg-[#F5F6F8] text-[#161B22] transition-colors dark:bg-[#0B0E14] dark:text-[#E6E9EF] font-sans">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* ---- Ticker header ---- */}
          <div className="rounded-2xl bg-[#161B22] px-5 py-4 sm:px-7 sm:py-5 shadow-sm dark:bg-[#12151C] dark:ring-1 dark:ring-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                </span>
                <h1 className="text-[15px] sm:text-base font-semibold tracking-tight text-white">
                  Item Ledger
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px] sm:text-xs text-white/70">
                <span>
                  TOTAL <b className="text-white">{items.length}</b>
                </span>
                <span>
                  SHOWN <b className="text-white">{filtered.length}</b>
                </span>
                <span>
                  PAGE <b className="text-white">{page}</b>/<b className="text-white">{totalPages}</b>
                </span>
                <button
                  onClick={() => setDark((d) => !d)}
                  title={dark ? "Switch to light theme" : "Switch to dark theme"}
                  className="ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* ---- Toolbar ---- */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A93A3] dark:text-[#6B7280]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search items…"
                className="w-full rounded-xl border border-[#E2E5EA] bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-[#9AA3B2] outline-none transition focus:border-[#161B22] dark:border-white/10 dark:bg-[#161A22] dark:text-[#E6E9EF] dark:placeholder:text-[#6B7280] dark:focus:border-white/30"
              />
            </div>

            <SimpleSelect
              value={baseKey}
              onChange={setBaseKey}
              options={BASE_OPTIONS}
              className="sm:w-52"
            />

            <SimpleSelect
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[{ value: "all", label: "All categories" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
              className="sm:w-44"
            />

            <SimpleSelect
              value={sortKey}
              onChange={setSortKey}
              icon={<ArrowUpDown className="h-3.5 w-3.5" />}
              options={[
                { value: "name-asc", label: "Name A–Z" },
                { value: "name-desc", label: "Name Z–A" },
                { value: "price-desc", label: "Price: high–low" },
                { value: "price-asc", label: "Price: low–high" },
              ]}
              className="sm:w-48"
            />

            <button
              onClick={copyAll}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E2E5EA] bg-white px-3.5 py-2.5 text-sm font-medium text-[#161B22] transition hover:bg-[#F0F1F4] active:scale-[0.98] dark:border-white/10 dark:bg-[#161A22] dark:text-[#E6E9EF] dark:hover:bg-[#1D2230]"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy all</span>
            </button>
          </div>

          {/* ---- Desktop table ---- */}
          <div className="mt-5 hidden overflow-hidden rounded-2xl border border-[#E7E9EE] bg-white md:block dark:border-white/10 dark:bg-[#12151C]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E7E9EE] bg-[#FAFAFB] text-left text-[11px] uppercase tracking-wide text-[#8A93A3] dark:border-white/10 dark:bg-[#161A22] dark:text-[#6B7280]">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  {/*<th className="px-5 py-3 font-medium">Max price</th>*/}
                  <th className="px-5 py-3 font-medium text-right">Copy</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-14 text-center text-[#9AA3B2] dark:text-[#6B7280]">
                      {items.length === 0 ? "No items in the ledger." : "Nothing matches those filters."}
                    </td>
                  </tr>
                ) : (
                  pageItems.map((item) => {
                    const badge = badgeStyle(item.class);
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-[#F0F1F4] last:border-0 hover:bg-[#FAFAFB] dark:border-white/5 dark:hover:bg-[#161A22]"
                      >
                        <td className="px-5 py-3.5 font-medium text-[#161B22] dark:text-[#E6E9EF]">{item.name}</td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${badge.bg} ${badge.text} ${badge.ring}`}
                          >
                            {item.class}
                          </span>
                        </td>
                        {/* <td className="px-5 py-3.5 font-mono text-[13px] text-[#4B5563] dark:text-[#9CA3AF]">
                          {item.maxPrice}
                        </td> */}
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end">
                            <IconBtn onClick={() => copyItem(item)} title="Copy">
                              <Copy className="h-4 w-4" />
                            </IconBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ---- Mobile cards ---- */}
          <div className="mt-5 space-y-2.5 md:hidden">
            {pageItems.length === 0 ? (
              <div className="rounded-2xl border border-[#E7E9EE] bg-white px-5 py-12 text-center text-sm text-[#9AA3B2] dark:border-white/10 dark:bg-[#12151C] dark:text-[#6B7280]">
                {items.length === 0 ? "No items in the ledger." : "Nothing matches those filters."}
              </div>
            ) : (
              pageItems.map((item) => {
                const badge = badgeStyle(item.class);
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#E7E9EE] bg-white p-4 dark:border-white/10 dark:bg-[#12151C]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#161B22] dark:text-[#E6E9EF]">{item.name}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${badge.bg} ${badge.text} ${badge.ring}`}
                          >
                            {item.class}
                          </span>
                          <span className="font-mono text-[13px] text-[#4B5563] dark:text-[#9CA3AF]">
                            {item.maxPrice}
                          </span>
                        </div>
                      </div>
                      <IconBtn onClick={() => copyItem(item)} title="Copy">
                        <Copy className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ---- Pagination ---- */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-1.5">
              <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} dark={dark}>
                <ChevronLeft className="h-4 w-4" />
              </PageBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce((acc, n, i, arr) => {
                  if (i > 0 && n - arr[i - 1] > 1) acc.push("…");
                  acc.push(n);
                  return acc;
                }, [])
                .map((n, i) =>
                  n === "…" ? (
                    <span key={`e${i}`} className="px-1.5 text-sm text-[#9AA3B2] dark:text-[#6B7280]">
                      …
                    </span>
                  ) : (
                    <PageBtn key={n} onClick={() => setPage(n)} active={n === page} dark={dark}>
                      {n}
                    </PageBtn>
                  )
                )}
              <PageBtn
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                dark={dark}
              >
                <ChevronRight className="h-4 w-4" />
              </PageBtn>
            </div>
          )}
        </div>

        {/* ---- Toast ---- */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#161B22] px-5 py-2.5 text-sm text-white shadow-lg dark:bg-[#E6E9EF] dark:text-[#0B0E14]">
            {toast}
          </div>
        )}
      </div>
    </>
  );
}

function IconBtn({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="rounded-lg p-1.5 text-[#9AA3B2] transition hover:bg-[#F0F1F4] hover:text-[#161B22] dark:text-[#6B7280] dark:hover:bg-white/10 dark:hover:text-[#E6E9EF]"
    >
      {children}
    </button>
  );
}

function PageBtn({ children, onClick, active, disabled, dark }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition ${
        active
          ? dark
            ? "bg-[#E6E9EF] text-[#0B0E14]"
            : "bg-[#161B22] text-white"
          : disabled
          ? "cursor-not-allowed text-[#D1D5DB] dark:text-[#374151]"
          : "text-[#4B5563] hover:bg-white hover:shadow-sm dark:text-[#9CA3AF] dark:hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}

// A minimal, dependency-free dropdown (no Radix) so this file has zero
// external UI dependencies beyond lucide-react icons.
function SimpleSelect({ value, onChange, options, icon, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-[#E2E5EA] bg-white px-3.5 py-2.5 text-sm text-[#161B22] transition hover:bg-[#FAFAFB] dark:border-white/10 dark:bg-[#161A22] dark:text-[#E6E9EF] dark:hover:bg-[#1D2230]"
      >
        <span className="flex items-center gap-1.5 truncate">
          {icon}
          {current ? current.label : "Select…"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#9AA3B2] dark:text-[#6B7280]" />
      </button>
      {open && (
        <div className="absolute z-40 mt-1.5 max-h-64 w-full min-w-[9rem] overflow-auto rounded-xl border border-[#E7E9EE] bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#161A22]">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                o.value === value
                  ? "bg-[#F0F1F4] font-medium text-[#161B22] dark:bg-white/10 dark:text-[#E6E9EF]"
                  : "text-[#4B5563] hover:bg-[#FAFAFB] dark:text-[#9CA3AF] dark:hover:bg-white/5"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
