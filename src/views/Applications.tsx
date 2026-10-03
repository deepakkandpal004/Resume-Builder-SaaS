"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  Plus,
  X,
  Trash2,
  ExternalLink,
  Briefcase,
  Building2,
  ChevronDown,
  Pencil,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import api from "@/lib/config/apiClient";

interface ApplicationItem {
  _id: string;
  company: string;
  role: string;
  source: string;
  jobUrl?: string;
  resumeId?: { _id: string } | string | null;
  appliedAt?: string;
  notes?: string;
  status: string;
  atsScoreAtApply?: number | null;
}

interface ResumeRef {
  _id: string;
  title?: string;
  lastAts?: { atsScore?: number };
}

interface ApplicationFormState {
  company: string;
  role: string;
  source: string;
  jobUrl: string;
  resumeId: string;
  appliedAt: string;
  notes: string;
}

const STATUSES = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

const STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const STATUS_STYLES: Record<string, string> = {
  applied: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  screening: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  interview: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
  offer: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  rejected: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  withdrawn: "bg-gray-500/10 text-gray-500 dark:text-gray-400",
};

const SOURCES = [
  { value: "naukri", label: "Naukri" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "referral", label: "Referral" },
  { value: "company-site", label: "Company site" },
  { value: "other", label: "Other" },
];

const sourceLabel = (s: string) => SOURCES.find((x) => x.value === s)?.label || "Other";

const formatDate = (d?: string | null) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const toDateInput = (d?: string | null) => {
  if (!d) return new Date().toISOString().slice(0, 10);
  return new Date(d).toISOString().slice(0, 10);
};

const emptyForm: ApplicationFormState = {
  company: "",
  role: "",
  source: "naukri",
  jobUrl: "",
  resumeId: "",
  appliedAt: toDateInput(null),
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-ink outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-muted";

const Modal: React.FC<{ onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }> = ({ onClose, title, children, wide }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
    className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm"
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      onClick={(e) => e.stopPropagation()}
      className={`relative w-full ${wide ? "max-w-lg" : "max-w-sm"} rounded-2xl border border-line bg-surface p-6 shadow-xl max-h-[90vh] overflow-y-auto`}
    >
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-muted transition hover:bg-line/30 hover:text-ink"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

const Applications: React.FC = () => {
  const { user, loading } = useSelector((state: any) => state.auth);
  const router = useRouter();

  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [resumes, setResumes] = useState<ResumeRef[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ApplicationItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const loadApplications = async () => {
    try {
      const { data } = await api.get("/api/applications/list");
      setApplications(Array.isArray(data.applications) ? data.applications : []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
      setApplications([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const loadResumes = async () => {
    try {
      const { data } = await api.get("/api/users/resumes");
      setResumes(Array.isArray(data.resumes) ? data.resumes : []);
    } catch {
      setResumes([]);
    }
  };

  useEffect(() => {
    if (user && !loading) {
      loadApplications();
      loadResumes();
    }
  }, [user, loading]);

  // Pre-fill the create modal from URL params — dashboard resume cards
  // (?resumeId=...) or the resume matcher (?resumeId=&company=&role=&jobUrl=&source=)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resumeId = params.get("resumeId") || "";
    const company = params.get("company") || "";
    const role = params.get("role") || "";
    const jobUrl = params.get("jobUrl") || "";
    const rawSource = (params.get("source") || "").toLowerCase();
    const source = ["naukri", "linkedin", "referral", "company-site", "other"].includes(rawSource)
      ? rawSource
      : "naukri";
    if (resumeId || company || role) {
      setForm((f) => ({
        ...f,
        resumeId,
        company: company.slice(0, 120),
        role: role.slice(0, 120),
        jobUrl: jobUrl.slice(0, 500),
        source,
      }));
      setPasteText("");
      setAiFilled(false);
      setShowModal(true);
      router.replace("/app/applications");
    }
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setPasteText("");
    setAiFilled(false);
    setShowModal(true);
  };

  const openEdit = (app: ApplicationItem) => {
    setEditing(app);
    setForm({
      company: app.company || "",
      role: app.role || "",
      source: app.source || "other",
      jobUrl: app.jobUrl || "",
      resumeId: typeof app.resumeId === "object" && app.resumeId ? app.resumeId._id : app.resumeId || "",
      appliedAt: toDateInput(app.appliedAt),
      notes: app.notes || "",
    });
    setPasteText("");
    setAiFilled(false);
    setShowModal(true);
  };

  const selectedResume = resumes.find((r) => r._id === form.resumeId);
  const selectedAts = selectedResume?.lastAts?.atsScore;

  const extractDetails = async () => {
    if (!pasteText.trim() || extracting) return;
    setExtracting(true);
    try {
      const { data } = await api.post("/api/applications/extract", {
        text: pasteText,
      });
      const ex = data.extracted || {};
      setForm((f) => ({
        ...f,
        company: ex.company || f.company,
        role: ex.role || f.role,
        source: ex.source || f.source,
        appliedAt: ex.appliedDate ? toDateInput(ex.appliedDate) : f.appliedAt,
        jobUrl: ex.jobUrl || f.jobUrl,
      }));
      setAiFilled(true);
      toast.success("Details extracted — please verify");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not extract details");
    } finally {
      setExtracting(false);
    }
  };

  const saveApplication = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) {
      toast.error("Company and role are required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { data } = await api.patch(`/api/applications/${editing._id}`, {
          company: form.company.trim(),
          role: form.role.trim(),
          source: form.source,
          jobUrl: form.jobUrl.trim(),
          resumeId: form.resumeId || null,
          appliedAt: form.appliedAt,
          notes: form.notes,
          atsScoreAtApply:
            typeof selectedAts === "number" ? selectedAts : editing.atsScoreAtApply ?? null,
        });
        setApplications((prev) =>
          prev.map((a) => (a._id === editing._id ? data.application : a))
        );
        toast.success("Application updated");
      } else {
        const { data } = await api.post("/api/applications/create", {
          company: form.company.trim(),
          role: form.role.trim(),
          source: form.source,
          jobUrl: form.jobUrl.trim(),
          resumeId: form.resumeId || null,
          appliedAt: form.appliedAt,
          notes: form.notes,
          atsScoreAtApply: typeof selectedAts === "number" ? selectedAts : null,
        });
        setApplications((prev) => [data.application, ...prev]);
        toast.success("Application tracked");
      }
      setShowModal(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (app: ApplicationItem, status: string) => {
    if (status === app.status) return;
    try {
      const { data } = await api.patch(`/api/applications/${app._id}`, { status });
      setApplications((prev) =>
        prev.map((a) => (a._id === app._id ? data.application : a))
      );
      toast.success(`Moved to ${STATUS_LABELS[status]}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  const deleteApplication = async (id: string) => {
    try {
      await api.delete(`/api/applications/${id}`);
      setApplications((prev) => prev.filter((a) => a._id !== id));
      toast.success("Application deleted");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const saveNotes = async (app: ApplicationItem) => {
    try {
      const { data } = await api.patch(`/api/applications/${app._id}`, {
        notes: notesDraft,
      });
      setApplications((prev) =>
        prev.map((a) => (a._id === app._id ? data.application : a))
      );
      toast.success("Notes saved");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: applications.length };
    STATUSES.forEach((s) => {
      c[s] = applications.filter((a) => a.status === s).length;
    });
    return c;
  }, [applications]);

  const stats = useMemo(() => {
    const total = applications.length;
    const responded = ["screening", "interview", "offer"].reduce(
      (n, s) => n + (counts[s] || 0),
      0
    );
    return {
      total,
      responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      interviews: counts.interview || 0,
      offers: counts.offer || 0,
    };
  }, [applications, counts]);

  const filtered =
    statusFilter === "all"
      ? applications
      : applications.filter((a) => a.status === statusFilter);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => router.push("/app")}
            className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
          >
            <ArrowLeft className="size-3.5" /> Back to resumes
          </button>
          <h1 className="text-2xl font-bold text-ink">Applications</h1>
          <p className="mt-1 text-sm text-muted">
            Track every job you apply to and the resume you used.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary px-5 py-2.5 text-sm">
          <Plus className="size-4" />
          <span>Track application</span>
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total applied", value: stats.total },
          { label: "Response rate", value: `${stats.responseRate}%` },
          { label: "Interviews", value: stats.interviews },
          { label: "Offers", value: stats.offers },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-line/65 bg-surface/50 p-4"
          >
            <span className="block text-[10px] font-extrabold uppercase tracking-wide text-muted">
              {s.label}
            </span>
            <span className="mt-1 block text-xl font-extrabold text-ink tabular-nums">
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* Pipeline filter */}
      <div className="mt-8 flex flex-wrap gap-2">
        {["all", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
              statusFilter === s
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
            <span className="ml-1.5 tabular-nums opacity-70">{counts[s] || 0}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-6 flex flex-col gap-3">
        {loadingApps ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-line bg-surface p-4"
            >
              <div className="h-4 w-1/3 rounded bg-line" />
              <div className="mt-2 h-3 w-1/4 rounded bg-line" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface py-16 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
              <Briefcase className="size-7 text-emerald-500" />
            </div>
            <p className="text-sm font-bold text-ink">
              {applications.length === 0
                ? "No applications tracked yet"
                : "No applications in this stage"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {applications.length === 0
                ? "Log your first application to start tracking your pipeline."
                : "Try a different stage filter."}
            </p>
            {applications.length === 0 && (
              <button onClick={openCreate} className="btn-primary mt-6 px-6 py-2.5 text-sm">
                <Plus className="size-4" />
                <span>Track your first application</span>
              </button>
            )}
          </div>
        ) : (
          filtered.map((app) => {
            const expanded = expandedId === app._id;
            const resumeTitle = app.resumeId?.title;
            return (
              <div
                key={app._id}
                className="rounded-xl border border-line bg-surface p-4 transition hover:border-line"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() => {
                      setExpandedId(expanded ? null : app._id);
                      setNotesDraft(app.notes || "");
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Building2 className="size-4 shrink-0 text-muted" />
                      <p className="truncate text-sm font-bold text-ink">
                        {app.company}
                      </p>
                    </div>
                    <p className="mt-1 truncate pl-6 text-sm text-muted">{app.role}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                      <span className="rounded-full bg-line/25 px-2 py-0.5 text-[10px] font-bold text-muted">
                        {sourceLabel(app.source)}
                      </span>
                      <span className="text-[11px] font-semibold text-muted">
                        {formatDate(app.appliedAt)}
                      </span>
                      {resumeTitle && (
                        <>
                          <span className="text-[11px] text-muted">·</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/app/builder/${app.resumeId?._id || app.resumeId}`);
                            }}
                            className="cursor-pointer text-[11px] font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                            title="Open this resume in the builder"
                          >
                            {resumeTitle}
                          </span>
                        </>
                      )}
                      {typeof app.atsScoreAtApply === "number" && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-300 tabular-nums">
                          ATS {app.atsScoreAtApply}%
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <div className="relative">
                      <select
                        value={app.status}
                        onChange={(e) => changeStatus(app, e.target.value)}
                        className={`appearance-none rounded-full py-1.5 pl-3 pr-8 text-[11px] font-bold outline-none cursor-pointer ${STATUS_STYLES[app.status]}`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 opacity-60" />
                    </div>
                    <button
                      onClick={() => openEdit(app)}
                      className="rounded-lg p-1.5 text-muted transition hover:bg-line/30 hover:text-ink"
                      title="Edit"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(app._id)}
                      className="rounded-lg p-1.5 text-muted transition hover:bg-red-500/10 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="mt-4 border-t border-line/40 pt-4 pl-6">
                    {app.jobUrl && (
                      <a
                        href={app.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <ExternalLink className="size-3.5" /> View job posting
                      </a>
                    )}
                    {app.statusHistory?.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {app.statusHistory.map((h, i) => (
                          <span key={i} className="flex items-center gap-1.5">
                            {i > 0 && <span className="text-muted">→</span>}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLES[h.status] || ""}`}
                            >
                              {STATUS_LABELS[h.status] || h.status}
                            </span>
                            <span className="text-[10px] text-muted">{formatDate(h.at)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3">
                      <textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Notes — recruiter replies, interview dates, follow-ups..."
                        rows={3}
                        className={inputClass}
                      />
                      <button
                        onClick={() => saveNotes(app)}
                        className="mt-2 rounded-xl border border-line bg-surface px-4 py-1.5 text-xs font-bold text-muted transition hover:text-ink hover:border-emerald-500"
                      >
                        Save notes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit modal */}
      <AnimatePresence>
        {showModal && (
          <Modal
            wide
            onClose={() => setShowModal(false)}
            title={editing ? "Edit application" : "Track application"}
          >
            <form onSubmit={saveApplication} className="flex flex-col gap-4">
              {!editing && (
                <div className="rounded-xl border border-dashed border-line p-4">
                  <label className="mb-1.5 block text-xs font-bold text-muted">
                    Paste confirmation <span className="font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste the confirmation message or job link here..."
                    rows={3}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={extractDetails}
                    disabled={extracting || !pasteText.trim()}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-4 py-2 text-xs font-bold text-muted transition hover:border-emerald-500 hover:text-ink disabled:opacity-50"
                  >
                    <Sparkles className="size-3.5" />
                    {extracting ? "Extracting..." : "Extract details"}
                  </button>
                  {aiFilled && (
                    <p className="mt-2 text-xs text-muted">
                      AI filled the form — please verify before saving.
                    </p>
                  )}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-muted">Company *</label>
                  <input
                    value={form.company}
                    onChange={(e) => set("company", e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-muted">Role *</label>
                  <input
                    value={form.role}
                    onChange={(e) => set("role", e.target.value)}
                    placeholder="e.g. MERN Stack Developer"
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-muted">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => set("source", e.target.value)}
                    className={inputClass}
                  >
                    {SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-muted">Date applied</label>
                  <input
                    type="date"
                    value={form.appliedAt}
                    onChange={(e) => set("appliedAt", e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted">Job posting URL</label>
                <input
                  value={form.jobUrl}
                  onChange={(e) => set("jobUrl", e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted">
                  Resume used
                </label>
                <select
                  value={form.resumeId}
                  onChange={(e) => set("resumeId", e.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {resumes.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.title}
                    </option>
                  ))}
                </select>
                {typeof selectedAts === "number" && (
                  <p className="mt-1.5 text-xs text-muted">
                    This resume's latest ATS score ({selectedAts}%) will be saved
                    with the application.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-muted">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Anything worth remembering..."
                  rows={2}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary mt-1 w-full justify-center py-2.5 text-sm disabled:opacity-60"
              >
                {saving ? "Saving..." : editing ? "Save changes" : "Track application"}
              </button>
            </form>
          </Modal>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteId && (
          <Modal onClose={() => setDeleteId(null)} title="Delete application?">
            <p className="text-sm text-muted">
              This will remove the application from your tracker. This cannot be
              undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-bold text-muted transition hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteApplication(deleteId)}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Applications;
