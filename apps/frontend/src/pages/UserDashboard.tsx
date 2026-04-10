import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllAvatars,
  updateMetadata,
  createSpace,
  getMySpaces,
  deleteSpace,
  getAllPublicSpaces,
} from "../lib/api";

type Avatar = { id: string; name: string; imageUrl: string };
type Space = { id: string; name: string; dimensions: string; thumbnail?: string };
type PublicSpace = Space & { createdBy: string };
type Tab = "spaces" | "browse" | "avatar";

export default function UserDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("browse");
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [browseLoading, setBrowseLoading] = useState(false);

  // Avatar selection
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  // Spaces
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [publicSpaces, setPublicSpaces] = useState<PublicSpace[]>([]);
  const [spaceForm, setSpaceForm] = useState({ name: "", dimensions: "", mapId: "" });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role === "Admin") { navigate("/login"); return; }
    init();
  }, []);

  async function init() {
    setLoading(true);
    try {
      const [avRes, spRes] = await Promise.all([getAllAvatars(), getMySpaces()]);
      setAvatars(avRes.avatars);
      setSpaces(spRes.spaces);
    } catch {}
    setLoading(false);
    fetchPublicSpaces();
  }

  async function fetchPublicSpaces() {
    setBrowseLoading(true);
    try {
      const res = await getAllPublicSpaces();
      setPublicSpaces(res.spaces);
    } catch {}
    setBrowseLoading(false);
  }

  function notify(msg: string, ok = true) {
    setStatus({ msg, ok });
    setTimeout(() => setStatus(null), 3500);
  }

  async function handlePickAvatar(avatarId: string) {
    try {
      setSelectedAvatar(avatarId);
      await updateMetadata(avatarId);
      notify("✅ Avatar updated!");
    } catch (err: any) {
      notify(err.message, false);
    }
  }

  async function handleCreateSpace(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body: any = { name: spaceForm.name, dimensions: spaceForm.dimensions };
      if (spaceForm.mapId.trim()) body.mapId = spaceForm.mapId.trim();
      const res = await createSpace(body);
      setSpaceForm({ name: "", dimensions: "", mapId: "" });
      await init();
      notify(`✅ Space created! ID: ${res.spaceId}`);
    } catch (err: any) {
      notify(err.message, false);
    }
  }

  async function handleDeleteSpace(spaceId: string) {
    if (!confirm("Delete this space?")) return;
    try {
      await deleteSpace(spaceId);
      setSpaces((prev) => prev.filter((s) => s.id !== spaceId));
      setPublicSpaces((prev) => prev.filter((s) => s.id !== spaceId));
      notify("🗑️ Space deleted.");
    } catch (err: any) {
      notify(err.message, false);
    }
  }

  function joinSpace(spaceId: string) {
    const token = localStorage.getItem("token");
    navigate(`/arena?spaceId=${spaceId}&token=${token}`);
  }

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    notify("📋 Space ID copied!");
  }

  const myUserId = localStorage.getItem("userId");
  const filteredPublicSpaces = publicSpaces.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.createdBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loader-screen">
        <div className="loader-spinner" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-bg">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🐝</span>
          <span>HiveRTC</span>
        </div>
        <p className="sidebar-role">User Panel</p>
        <nav className="sidebar-nav">
          <button className={`nav-item ${tab === "browse" ? "active" : ""}`} onClick={() => setTab("browse")}>
            🌐 Browse Spaces
          </button>
          <button className={`nav-item ${tab === "spaces" ? "active" : ""}`} onClick={() => setTab("spaces")}>
            🏠 My Spaces
          </button>
          <button className={`nav-item ${tab === "avatar" ? "active" : ""}`} onClick={() => setTab("avatar")}>
            🧑 My Avatar
          </button>
        </nav>
        <button className="logout-btn" onClick={() => { localStorage.clear(); navigate("/login"); }}>
          🚪 Logout
        </button>
      </aside>

      {/* Main */}
      <main className="dashboard-main">
        <div className="dash-header">
          <h1 className="dash-title">
            {tab === "browse" ? "🌐 Browse All Spaces" : tab === "spaces" ? "🏠 My Spaces" : "🧑 Choose Avatar"}
          </h1>
        </div>

        {status && (
          <div className={`toast ${status.ok ? "toast-ok" : "toast-err"}`}>{status.msg}</div>
        )}

        {/* BROWSE TAB – all spaces */}
        {tab === "browse" && (
          <div className="tab-content">
            <div className="card">
              <div className="browse-header">
                <div className="browse-count">
                  {browseLoading
                    ? <span className="browse-loading">Loading...</span>
                    : <span>{filteredPublicSpaces.length} space{filteredPublicSpaces.length !== 1 ? "s" : ""} available</span>
                  }
                </div>
                <div className="browse-controls">
                  <input
                    className="form-input search-input"
                    placeholder="🔍 Search by name or creator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="btn-secondary" onClick={fetchPublicSpaces}>↺ Refresh</button>
                </div>
              </div>

              {browseLoading ? (
                <div className="empty-state">
                  <div className="loader-spinner" />
                </div>
              ) : filteredPublicSpaces.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-icon">🌐</p>
                  <p className="empty-msg">
                    {searchQuery ? "No spaces match your search." : "No spaces have been created yet."}
                  </p>
                </div>
              ) : (
                <div className="spaces-grid">
                  {filteredPublicSpaces.map((sp) => (
                    <div key={sp.id} className="space-card">
                      <div className="space-thumb">
                        {sp.thumbnail
                          ? <img src={sp.thumbnail} alt={sp.name} className="space-thumb-img" />
                          : <span className="space-thumb-icon">🌐</span>
                        }
                      </div>
                      <div className="space-info">
                        <h3 className="space-name">{sp.name}</h3>
                        <p className="space-dim">{sp.dimensions}</p>
                        <p className="space-creator">by {sp.createdBy}</p>
                        <button className="space-id-copy" onClick={() => copyId(sp.id)}>
                          📋 {sp.id.slice(0, 14)}...
                        </button>
                      </div>
                      <div className="space-actions">
                        <button className="btn-primary" onClick={() => joinSpace(sp.id)}>▶ Join</button>
                        {/* show delete only if current user owns it */}
                        {myUserId && sp.createdBy === localStorage.getItem("username") && (
                          <button className="btn-danger" onClick={() => handleDeleteSpace(sp.id)}>🗑️</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MY SPACES TAB */}
        {tab === "spaces" && (
          <div className="tab-content">
            <div className="card">
              <h2 className="card-title">Create a New Space</h2>
              <form onSubmit={handleCreateSpace} className="grid-form">
                <div className="form-group">
                  <label className="form-label">Space Name</label>
                  <input className="form-input" placeholder="e.g. Team Hub" value={spaceForm.name}
                    onChange={(e) => setSpaceForm({ ...spaceForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Dimensions (e.g. 100x100)</label>
                  <input className="form-input" placeholder="100x100" value={spaceForm.dimensions}
                    onChange={(e) => setSpaceForm({ ...spaceForm, dimensions: e.target.value })}
                    pattern="[0-9]{1,4}x[0-9]{1,4}" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Map ID (optional)</label>
                  <input className="form-input" placeholder="Leave blank for empty space"
                    value={spaceForm.mapId}
                    onChange={(e) => setSpaceForm({ ...spaceForm, mapId: e.target.value })} />
                  <p className="form-hint">Use a Map ID created by admin to pre-load elements</p>
                </div>
                <button className="btn-primary full-width" type="submit">Create Space</button>
              </form>
            </div>

            <div className="card">
              <h2 className="card-title">Your Spaces ({spaces.length})</h2>
              {spaces.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-icon">🗺️</p>
                  <p className="empty-msg">No spaces yet. Create your first one above!</p>
                </div>
              ) : (
                <div className="spaces-grid">
                  {spaces.map((sp) => (
                    <div key={sp.id} className="space-card">
                      <div className="space-thumb">
                        {sp.thumbnail
                          ? <img src={sp.thumbnail} alt={sp.name} className="space-thumb-img" />
                          : <span className="space-thumb-icon">🌐</span>
                        }
                      </div>
                      <div className="space-info">
                        <h3 className="space-name">{sp.name}</h3>
                        <p className="space-dim">{sp.dimensions}</p>
                        <button className="space-id-copy" onClick={() => copyId(sp.id)}>
                          📋 {sp.id.slice(0, 14)}...
                        </button>
                      </div>
                      <div className="space-actions">
                        <button className="btn-primary" onClick={() => joinSpace(sp.id)}>▶ Join</button>
                        <button className="btn-danger" onClick={() => handleDeleteSpace(sp.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AVATAR TAB */}
        {tab === "avatar" && (
          <div className="tab-content">
            <div className="card">
              <h2 className="card-title">Choose Your Avatar</h2>
              {avatars.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-icon">😶</p>
                  <p className="empty-msg">No avatars available. Ask an admin to create some.</p>
                </div>
              ) : (
                <div className="avatar-grid">
                  {avatars.map((av) => (
                    <div
                      key={av.id}
                      className={`avatar-card selectable ${selectedAvatar === av.id ? "selected" : ""}`}
                      onClick={() => handlePickAvatar(av.id)}
                    >
                      <div className="avatar-img-wrap">
                        <img src={av.imageUrl} alt={av.name} className="avatar-img"
                          onError={(e) => { e.currentTarget.style.display = "none"; }} />
                        <span className="avatar-fallback">👤</span>
                      </div>
                      <p className="avatar-name">{av.name}</p>
                      {selectedAvatar === av.id && <span className="avatar-check">✓ Selected</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
