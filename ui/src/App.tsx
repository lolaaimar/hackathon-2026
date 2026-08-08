import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useGovFund } from "./state/provider";
import { AppShell } from "./components/AppShell";
import { Button } from "./components/ui/Button";
import { EmptyState } from "./components/ui/EmptyState";
import { CubeIcon } from "./components/ui/icons";
import { LoginPage } from "./pages/LoginPage";
import { DeployPage } from "./pages/DeployPage";
import { AdminHome } from "./pages/admin/AdminHome";
import { MemberHome } from "./pages/member/MemberHome";
import { MemberProjectDetail } from "./pages/member/MemberProjectDetail";
import { CompanyHome } from "./pages/company/CompanyHome";
import { CompanyProjectDetail } from "./pages/company/CompanyProjectDetail";
import { ContractPage } from "./pages/ContractPage";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/deploy" element={<DeployPage />} />
        <Route element={<RequireDeployed />}>
          <Route path="/contract" element={<ContractPage />} />
          <Route path="/gov" element={<GovIndex />} />
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/member" element={<MemberHome />} />
          <Route path="/member/projects/:id" element={<MemberProjectDetail />} />
          <Route path="/company" element={<CompanyHome />} />
          <Route path="/company/projects/:id" element={<CompanyProjectDetail />} />
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/deploy" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function RequireAuth() {
  const { state } = useGovFund();
  if (!state.role) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function GovIndex() {
  const { state } = useGovFund();
  return <Navigate to={state.role === "admin" ? "/admin" : "/member"} replace />;
}

function RequireDeployed() {
  const { state } = useGovFund();
  if (!state.contract.deployed) {
    return (
      <div className="py-16">
        <EmptyState
          icon={<CubeIcon size={26} />}
          title="Deploy the contract first"
          body="Projects, members and bids unlock once the GovFund contract is deployed."
          action={
            <Link to="/deploy">
              <Button>
                <CubeIcon size={15} /> Deploy contract
              </Button>
            </Link>
          }
        />
      </div>
    );
  }
  return <Outlet />;
}
