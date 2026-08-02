import { logoutUser } from "../../services/authService";

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
            className={({ isActive }) =>
              isActive ? "sidebar-link active" : "sidebar-link"
            }
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}

        <button className="sidebar-link logout-link" onClick={logout}>
          <FaSignOutAlt />
          <span>Logout</span>
        </button>
      </nav>

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