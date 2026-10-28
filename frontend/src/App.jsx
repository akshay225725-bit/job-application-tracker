import { useCallback, useEffect, useState } from "react";
import {
    BrowserRouter,
    Routes,
    Route,
    Link,
    useNavigate,
    useParams
} from "react-router-dom";

import { applicationService } from "./services/applicationService";
import "./index.css";

const STATUSES = [
    "Applied",
    "Interview",
    "Offer",
    "Rejected",
    "Accepted",
    "Declined"
];

const JOB_TYPES = ["Full-time", "Internship", "Contract"];

const FINAL_STATUSES = ["Rejected", "Accepted", "Declined"];

const NEXT_STATUSES = {
    Applied: ["Interview", "Rejected"],
    Interview: ["Offer", "Rejected"],
    Offer: ["Accepted", "Declined"],
    Rejected: [],
    Accepted: [],
    Declined: []
};

const emptyForm = {
    companyName: "",
    jobRole: "",
    jobType: "Full-time",
    appliedDate: new Date().toLocaleDateString("en-CA"),
    expectedSalary: "",
    notes: ""
};

function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC"
    });
}

function formatDateTime(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function StatusBadge({ status }) {
    return (
        <span
            className={`status-badge status-${status.toLowerCase()}`}
        >
            {status}
        </span>
    );
}

function Navbar() {
    return (
        <header className="navbar">
            <Link className="brand" to="/">
                <span className="brand-icon">J</span>
                <span>
                    <strong>CareerTrack</strong>
                    <small>Job Application Manager</small>
                </span>
            </Link>

            <nav>
                <Link to="/">Dashboard</Link>
                <Link className="nav-button" to="/add">
                    + Add Application
                </Link>
            </nav>
        </header>
    );
}

function Layout({ children }) {
    return (
        <>
            <Navbar />
            <main className="container">{children}</main>
            <footer className="footer">
                CareerTrack · Keep your career journey organized.
            </footer>
        </>
    );
}

function SummaryCards({ stats }) {
    const items = [
        { label: "Total Applications", value: stats.total ?? 0, className: "total" },
        { label: "Applied", value: stats.counts?.Applied ?? 0, className: "applied" },
        { label: "Interview", value: stats.counts?.Interview ?? 0, className: "interview" },
        { label: "Offers", value: stats.counts?.Offer ?? 0, className: "offer" },
        { label: "Accepted", value: stats.counts?.Accepted ?? 0, className: "accepted" },
        { label: "Rejected", value: stats.counts?.Rejected ?? 0, className: "rejected" },
        { label: "Declined", value: stats.counts?.Declined ?? 0, className: "declined" }
    ];

    return (
        <section className="summary-grid">
            {items.map((item) => (
                <article
                    className={`summary-card ${item.className}`}
                    key={item.label}
                >
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                </article>
            ))}
        </section>
    );
}

function Dashboard() {
    const [applications, setApplications] = useState([]);
    const [stats, setStats] = useState({ total: 0, counts: {} });
    const [status, setStatus] = useState("");
    const [company, setCompany] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [list, summary] = await Promise.all([
                applicationService.getAll({ status, company }),
                applicationService.getStats()
            ]);

            setApplications(list);
            setStats(summary);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [status, company]);

    useEffect(() => {
        const timer = setTimeout(loadData, 250);
        return () => clearTimeout(timer);
    }, [loadData]);

    async function handleDelete(application) {
        const confirmed = window.confirm(
            `Delete ${application.applicationId} — ${application.companyName}?`
        );

        if (!confirmed) return;

        try {
            await applicationService.delete(application._id);
            await loadData();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <Layout>
            <section className="hero">
                <div>
                    <span className="eyebrow">YOUR CAREER, ORGANIZED</span>
                    <h1>Job Application Dashboard</h1>
                    <p>
                        Track every opportunity, follow up on time,
                        and keep your next career move in sight.
                    </p>
                </div>

                <Link className="primary-button" to="/add">
                    + New Application
                </Link>
            </section>

            <SummaryCards stats={stats} />

            <section className="panel">
                <div className="panel-heading">
                    <div>
                        <h2>Your applications</h2>
                        <p>Search and manage your job opportunities.</p>
                    </div>
                    <span className="result-count">
                        {applications.length} shown
                    </span>
                </div>

                <div className="filters">
                    <label className="search-box">
                        <span>⌕</span>
                        <input
                            type="search"
                            placeholder="Search by company..."
                            value={company}
                            onChange={(event) => setCompany(event.target.value)}
                        />
                    </label>

                    <select
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        aria-label="Filter by status"
                    >
                        <option value="">All statuses</option>
                        {STATUSES.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>

                    <button
                        className="secondary-button"
                        onClick={() => {
                            setCompany("");
                            setStatus("");
                        }}
                    >
                        Clear
                    </button>
                </div>

                {error && <div className="alert error">{error}</div>}

                {loading ? (
                    <div className="empty-state">Loading applications...</div>
                ) : applications.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">↗</div>
                        <h3>No applications found</h3>
                        <p>Add your first application or change your filters.</p>
                        <Link className="primary-button" to="/add">
                            Add application
                        </Link>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Application</th>
                                    <th>Company / Role</th>
                                    <th>Status</th>
                                    <th>Applied date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {applications.map((item) => (
                                    <tr key={item._id}>
                                        <td>
                                            <Link
                                                className="application-id"
                                                to={`/application/${item._id}`}
                                            >
                                                {item.applicationId}
                                            </Link>

                                            {item.isOverdue && (
                                                <div className="overdue-badge">
                                                    Follow-up Overdue
                                                </div>
                                            )}
                                        </td>

                                        <td>
                                            <strong>{item.companyName}</strong>
                                            <span className="subtext">
                                                {item.jobRole}
                                            </span>
                                        </td>

                                        <td>
                                            <StatusBadge status={item.status} />
                                        </td>

                                        <td>{formatDate(item.appliedDate)}</td>

                                        <td>
                                            <div className="action-links">
                                                <Link to={`/application/${item._id}`}>
                                                    View
                                                </Link>

                                                <Link to={`/edit/${item._id}`}>
                                                    Edit
                                                </Link>

                                                <button
                                                    className="text-danger"
                                                    disabled={
                                                        item.status === "Interview" ||
                                                        item.status === "Offer"
                                                    }
                                                    title={
                                                        ["Interview", "Offer"].includes(item.status)
                                                            ? "Cannot delete during Interview or Offer"
                                                            : "Delete application"
                                                    }
                                                    onClick={() => handleDelete(item)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </Layout>
    );
}

function ApplicationForm({ editing = false }) {
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(editing);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (!editing) return;

        let active = true;

        applicationService.getById(id)
            .then((item) => {
                if (!active) return;

                setForm({
                    companyName: item.companyName,
                    jobRole: item.jobRole,
                    jobType: item.jobType,
                    appliedDate: item.appliedDate.slice(0, 10),
                    expectedSalary: item.expectedSalary ?? "",
                    notes: item.notes ?? ""
                });
            })
            .catch((err) => {
                if (active) setError(err.message);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [editing, id]);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSuccess("");

        if (!form.companyName.trim() || !form.jobRole.trim()) {
            setError("Company name and job role are required.");
            return;
        }

        if (!form.appliedDate) {
            setError("Please select an applied date.");
            return;
        }

        const today = new Date().toLocaleDateString("en-CA");

        if (!editing && form.appliedDate > today) {
            setError("Applied date cannot be in the future.");
            return;
        }

        if (
            form.expectedSalary !== "" &&
            (!Number.isFinite(Number(form.expectedSalary)) ||
                Number(form.expectedSalary) < 0)
        ) {
            setError("Expected salary must be a non-negative number.");
            return;
        }

        const payload = {
            companyName: form.companyName.trim(),
            jobRole: form.jobRole.trim(),
            jobType: form.jobType,
            expectedSalary:
                form.expectedSalary === ""
                    ? null
                    : Number(form.expectedSalary),
            notes: form.notes
        };

        if (!editing) {
            payload.appliedDate = form.appliedDate;
        }

        setSaving(true);

        try {
            if (editing) {
                await applicationService.update(id, payload);
                setSuccess("Application updated successfully.");
            } else {
                await applicationService.create(payload);
                setSuccess("Application created successfully.");
            }

            setTimeout(() => navigate("/"), 600);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <Layout>
                <div className="empty-state">Loading application...</div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="page-heading">
                <Link className="back-link" to="/">
                    ← Back to dashboard
                </Link>

                <h1>{editing ? "Edit application" : "Add application"}</h1>

                <p>
                    {editing
                        ? "Update your job details. The Application ID and applied date cannot be changed."
                        : "Record a new opportunity and keep your job search organized."}
                </p>
            </div>

            <section className="form-panel">
                {error && <div className="alert error">{error}</div>}
                {success && <div className="alert success">{success}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-grid">
                        <label>
                            Company name <span className="required">*</span>
                            <input
                                name="companyName"
                                value={form.companyName}
                                onChange={handleChange}
                                placeholder="e.g. Infosys"
                                maxLength={150}
                                required
                            />
                        </label>

                        <label>
                            Job role <span className="required">*</span>
                            <input
                                name="jobRole"
                                value={form.jobRole}
                                onChange={handleChange}
                                placeholder="e.g. Software Developer"
                                maxLength={150}
                                required
                            />
                        </label>

                        <label>
                            Job type <span className="required">*</span>
                            <select
                                name="jobType"
                                value={form.jobType}
                                onChange={handleChange}
                                required
                            >
                                {JOB_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Applied date <span className="required">*</span>
                            <input
                                type="date"
                                name="appliedDate"
                                value={form.appliedDate}
                                onChange={handleChange}
                                max={new Date().toLocaleDateString("en-CA")}
                                disabled={editing}
                                required
                            />
                            {editing && (
                                <small className="field-help">
                                    Applied date cannot be edited.
                                </small>
                            )}
                        </label>

                        <label>
                            Expected salary
                            <input
                                type="number"
                                name="expectedSalary"
                                min="0"
                                step="any"
                                value={form.expectedSalary}
                                onChange={handleChange}
                                placeholder="Optional"
                            />
                        </label>

                        <label className="full-width">
                            Notes
                            <textarea
                                name="notes"
                                value={form.notes}
                                onChange={handleChange}
                                placeholder="Interview details, contact information, or reminders..."
                                rows="5"
                                maxLength={5000}
                            />
                        </label>
                    </div>

                    <div className="form-footer">
                        <Link className="secondary-button" to="/">
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            className="primary-button"
                            disabled={saving}
                        >
                            {saving
                                ? "Saving..."
                                : editing
                                    ? "Save changes"
                                    : "Create application"}
                        </button>
                    </div>
                </form>
            </section>
        </Layout>
    );
}

function ApplicationDetails() {
    const { id } = useParams();

    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [saving, setSaving] = useState(false);

    const loadApplication = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const item = await applicationService.getById(id);
            setApplication(item);
            setSelectedStatus(NEXT_STATUSES[item.status]?.[0] || "");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadApplication();
    }, [loadApplication]);

    async function handleStatusChange(event) {
        event.preventDefault();

        if (!selectedStatus) return;

        setSaving(true);
        setError("");

        try {
            await applicationService.changeStatus(id, selectedStatus);
            await loadApplication();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!application) return;

        if (
            !window.confirm(
                `Delete ${application.applicationId} — ${application.companyName}?`
            )
        ) {
            return;
        }

        try {
            await applicationService.delete(id);
            window.location.href = "/";
        } catch (err) {
            setError(err.message);
        }
    }

    if (loading) {
        return (
            <Layout>
                <div className="empty-state">Loading details...</div>
            </Layout>
        );
    }

    if (error && !application) {
        return (
            <Layout>
                <div className="alert error">{error}</div>
                <Link to="/">Return to dashboard</Link>
            </Layout>
        );
    }

    if (!application) return null;

    const nextStatuses = NEXT_STATUSES[application.status] || [];

    return (
        <Layout>
            <div className="page-heading">
                <Link className="back-link" to="/">
                    ← Back to dashboard
                </Link>

                <div className="detail-title-row">
                    <div>
                        <span className="eyebrow">
                            {application.applicationId}
                        </span>
                        <h1>{application.companyName}</h1>
                        <p>{application.jobRole}</p>
                    </div>

                    <StatusBadge status={application.status} />
                </div>
            </div>

            {error && <div className="alert error">{error}</div>}

            {application.isOverdue && (
                <div className="overdue-banner">
                    <strong>Follow-up Overdue</strong>
                    <span>
                        This application is still Applied after its follow-up date.
                    </span>
                </div>
            )}

            <div className="details-grid">
                <section className="panel detail-panel">
                    <h2>Application details</h2>

                    <dl className="details-list">
                        <div>
                            <dt>Application ID</dt>
                            <dd>{application.applicationId}</dd>
                        </div>

                        <div>
                            <dt>Company</dt>
                            <dd>{application.companyName}</dd>
                        </div>

                        <div>
                            <dt>Job role</dt>
                            <dd>{application.jobRole}</dd>
                        </div>

                        <div>
                            <dt>Job type</dt>
                            <dd>{application.jobType}</dd>
                        </div>

                        <div>
                            <dt>Applied date</dt>
                            <dd>{formatDate(application.appliedDate)}</dd>
                        </div>

                        <div>
                            <dt>Expected salary</dt>
                            <dd>
                                {application.expectedSalary == null
                                    ? "Not specified"
                                    : Number(application.expectedSalary).toLocaleString("en-IN")}
                            </dd>
                        </div>

                        <div>
                            <dt>Follow-up date</dt>
                            <dd>{formatDate(application.followUpDate)}</dd>
                        </div>

                        <div className="notes-row">
                            <dt>Notes</dt>
                            <dd>{application.notes || "No notes added."}</dd>
                        </div>
                    </dl>

                    <div className="detail-actions">
                        <Link
                            className="primary-button"
                            to={`/edit/${application._id}`}
                        >
                            Edit details
                        </Link>

                        <button
                            className="secondary-button"
                            onClick={handleDelete}
                            disabled={["Interview", "Offer"].includes(application.status)}
                        >
                            Delete
                        </button>
                    </div>

                    {["Interview", "Offer"].includes(application.status) && (
                        <p className="field-help">
                            Deletion is disabled while an application is in Interview or Offer.
                        </p>
                    )}
                </section>

                <section className="panel detail-panel">
                    <h2>Update status</h2>
                    <p className="muted">
                        Only the next permitted statuses are available.
                    </p>

                    {nextStatuses.length > 0 ? (
                        <form onSubmit={handleStatusChange}>
                            <label>
                                New status
                                <select
                                    value={selectedStatus}
                                    onChange={(event) =>
                                        setSelectedStatus(event.target.value)
                                    }
                                >
                                    {nextStatuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <button
                                className="primary-button full-button"
                                type="submit"
                                disabled={saving}
                            >
                                {saving ? "Updating..." : "Update status"}
                            </button>
                        </form>
                    ) : (
                        <div className="final-state">
                            <strong>Final status</strong>
                            <p>
                                This application is complete. No further status
                                changes are allowed.
                            </p>
                        </div>
                    )}

                    <div className="timeline-heading">
                        <h2>Status history</h2>
                        <p className="muted">
                            A chronological record of your application.
                        </p>
                    </div>

                    <div className="timeline">
                        {[...(application.statusHistory || [])]
                            .sort((a, b) => new Date(a.date) - new Date(b.date))
                            .map((item, index) => (
                                <div className="timeline-item" key={`${item.status}-${item.date}-${index}`}>
                                    <span className="timeline-dot" />

                                    <div>
                                        <StatusBadge status={item.status} />
                                        <p>{formatDateTime(item.date)}</p>
                                    </div>
                                </div>
                            ))}
                    </div>
                </section>
            </div>
        </Layout>
    );
}

function NotFound() {
    return (
        <Layout>
            <div className="empty-state">
                <h2>Page not found</h2>
                <Link className="primary-button" to="/">
                    Back to dashboard
                </Link>
            </div>
        </Layout>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/add" element={<ApplicationForm />} />
                <Route
                    path="/edit/:id"
                    element={<ApplicationForm editing />}
                />
                <Route
                    path="/application/:id"
                    element={<ApplicationDetails />}
                />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}