import { logoutUser } from "../../services/authService";
import { useState } from "react";

import {
  FaChartBar,
  FaCog,
  FaFileInvoice,
  FaGem,
  FaHeadset,
  FaHome,
  FaSignOutAlt,
  FaTag,
  FaUsers,
} from "react-icons/fa";

import { NavLink, useNavigate } from "react-router-dom";

// Sidebar is the left navigation panel shown on all pages after login.
// It highlights the currently active page using NavLink's isActive prop.
function Sidebar() {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const storedUser = localStorage.getItem("user");
  let user = null;

  try {
    user = storedUser ? JSON.parse(storedUser) : null;
  } catch {
    user = null;
  }

  // List of all navigation links shown in the sidebar menu.
  const menuItems = [
    { name: "Home / Dashboard", icon: <FaHome />, path: user?.is_superuser ? "/admin-dashboard" : "/dashboard" },
    { name: "Token / Gold Deposit", icon: <FaTag />, path: "/tokens" },
    { name: "Billing / Gold Return", icon: <FaFileInvoice />, path: "/billing" },
    ...(user?.is_superuser ? [{ name: "Master / Die Price", icon: <FaGem />, path: "/die-price" }] : []),
    { name: "Reports", icon: <FaChartBar />, path: "/reports" },
    { name: "Customers", icon: <FaUsers />, path: "/customers" },
    ...(user?.is_superuser ? [{ name: "Settings", icon: <FaCog />, path: "/settings" }] : []),
  ];

  // Clear auth data from localStorage and go back to login page.
  const logout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="small-logo">NDC</div>

        <h2>NELLORE</h2>
        <h3>DIE CUTTING</h3>
        <p>— Jewellery Die Cutting —</p>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `sidebar-link sidebar-link-${item.name.toLowerCase().replace(/[^a-z]+/g, "-")} ${isActive ? "active" : ""}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}

        <button className="sidebar-link logout-link sidebar-link-logout" onClick={logout}>
          <FaSignOutAlt />
          <span>Logout</span>
        </button>

        <button
          type="button"
          className={`sidebar-link mobile-more-link ${moreOpen ? "active" : ""}`}
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
        >
          <FaHeadset />
          <span>More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="mobile-more-menu">
          <NavLink to="/customers" onClick={() => setMoreOpen(false)}><FaUsers />Customers</NavLink>
          {user?.is_superuser && <NavLink to="/settings" onClick={() => setMoreOpen(false)}><FaCog />Settings</NavLink>}
          <button type="button" onClick={logout}><FaSignOutAlt />Logout</button>
        </div>
      )}

      <div className="sidebar-help">
        <FaHeadset />

        <div>
          <span>Need Help?</span>
          <strong>Contact Admin</strong>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
