import { createClient } from "@supabase/supabase-js";

// This key is safe to use in a browser if you have enabled Row Level Security for your tables and configured policies.
const SUPABASE_URL = "https://czjgbqddgtoxisbdsvud.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6amdicWRkZ3RveGlzYmRzdnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxMzUwOTcsImV4cCI6MjEwMTcxMTA5N30.eM9JkYoweIg_udn6FgPkrkNIymNVSdntokSbuJd_ZPs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface ProposalDescription {
  proposal_id: string;
  project_id: string;
  description: string;
}

export async function loadDescriptions(): Promise<ProposalDescription[]> {
  const { data, error } = await supabase
    .from("proposal_descriptions")
    .select("proposal_id, project_id, description");

  if (error || !data) return [];
  return data as ProposalDescription[];
}

export async function saveDescriptions(
  descs: ProposalDescription[],
): Promise<void> {
  await supabase
    .from("proposal_descriptions")
    .upsert(descs, { onConflict: "proposal_id" });
}
