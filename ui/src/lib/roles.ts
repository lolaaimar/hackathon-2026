import type { Role } from "../types";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  member: "Government",
  company: "Company",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin: "Member registry & thresholds",
  member: "Projects, votes & stage reviews",
  company: "Bids, reveal & payments",
};
