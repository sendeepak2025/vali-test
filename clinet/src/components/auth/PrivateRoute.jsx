
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

function PrivateRoute({ children }) {
  const { token, user } = useSelector((state) => state.auth);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/auth" />;
  }

  // Check if store user has pending approval status
  if (user?.role === "store") {
    const approvalStatus = user?.approvalStatus;
    const currentPath = location.pathname;
    
    // Allow access to pending-approval page regardless of status
    if (currentPath === "/pending-approval") {
      return children;
    }
    
    // Redirect pending or rejected stores to pending approval page
    if (approvalStatus === "pending" || approvalStatus === "rejected") {
      return <Navigate to="/pending-approval" />;
    }
    
    // Approved stores get full access
    return children;
  }

  if (user?.role === "admin") {
    return children;
  } else if (user?.role === "member") {
    return children;
  }

  return <Navigate to="/" />;
}

export default PrivateRoute;
