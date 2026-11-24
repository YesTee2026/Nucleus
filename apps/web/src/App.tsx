import { AppLayout } from "@/components/layout/AppLayout";

import { CIDetailPage } from "@/pages/CIDetailPage";

import { ClassesPage } from "@/pages/ClassesPage";

import { ConfigurationItemsPage } from "@/pages/ConfigurationItemsPage";

import { DashboardPage } from "@/pages/DashboardPage";

import {

  ActivitiesPage,

  ScriptsPage,

} from "@/pages/PlaceholderPages";
import { SettingsPage } from "@/pages/settings/SettingsPage";

import { DiscoveryPage } from "@/pages/discovery/DiscoveryPage";
import { FieldMappingsPage } from "@/pages/discovery/FieldMappingsPage";
import { ReviewQueuePage } from "@/pages/discovery/ReviewQueuePage";
import { AgentsPage } from "@/pages/agents/AgentsPage";
import { AgentRunsPage } from "@/pages/agents/AgentRunsPage";
import { SchedulesPage } from "@/pages/agents/SchedulesPage";
import { StagingPage } from "@/pages/agents/StagingPage";
import { MemoryPage } from "@/pages/agents/MemoryPage";
import { ReportingChatPage } from "@/pages/agents/ReportingChatPage";

import { RelationshipsPage } from "@/pages/RelationshipsPage";

import { FindingsPage } from "@/pages/vuln/FindingsPage";

import { GroupsPage } from "@/pages/vuln/GroupsPage";

import { RulesPage } from "@/pages/vuln/RulesPage";

import { ScannersPage } from "@/pages/vuln/ScannersPage";

import { TicketDetailPage } from "@/pages/vuln/TicketDetailPage";

import { TicketsPage } from "@/pages/vuln/TicketsPage";

import { VulnDashboardPage } from "@/pages/vuln/VulnDashboardPage";

import { AppStoreProvider } from "@/store/AppStore";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

export default function App() {
  return (
    <AppStoreProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>

          <Route index element={<DashboardPage />} />

          <Route path="classes" element={<ClassesPage />} />

          <Route path="configuration-items" element={<ConfigurationItemsPage />} />

          <Route path="configuration-items/:id" element={<CIDetailPage />} />

          <Route path="relationships" element={<RelationshipsPage />} />

          <Route path="vulnerabilities" element={<VulnDashboardPage />} />

          <Route path="vulnerabilities/findings" element={<FindingsPage />} />

          <Route path="vulnerabilities/groups" element={<GroupsPage />} />

          <Route path="vulnerabilities/tickets" element={<TicketsPage />} />

          <Route path="vulnerabilities/tickets/:id" element={<TicketDetailPage />} />

          <Route path="vulnerabilities/scanners" element={<ScannersPage />} />

          <Route path="vulnerabilities/rules" element={<RulesPage />} />

          <Route path="discovery" element={<DiscoveryPage />} />
          <Route path="discovery/mappings" element={<FieldMappingsPage />} />
          <Route path="discovery/review" element={<ReviewQueuePage />} />

          <Route path="agents" element={<AgentsPage />} />
          <Route path="agents/reporting" element={<ReportingChatPage />} />
          <Route path="agents/schedules" element={<SchedulesPage />} />
          <Route path="agents/runs" element={<AgentRunsPage />} />
          <Route path="agents/staging" element={<StagingPage />} />
          <Route path="agents/memory" element={<MemoryPage />} />

          <Route path="activities" element={<ActivitiesPage />} />

          <Route path="scripts" element={<ScriptsPage />} />

          <Route path="settings" element={<SettingsPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />

        </Route>

      </Routes>
    </BrowserRouter>
    </AppStoreProvider>
  );
}

