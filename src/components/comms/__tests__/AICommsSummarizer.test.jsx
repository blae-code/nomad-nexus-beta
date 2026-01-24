import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import AICommsSummarizer from "@/components/comms/AICommsSummarizer";

const malicious = "<script>window.__xss = true</script>";

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      Message: {
        list: vi.fn(async () => [
          {
            id: "log-1",
            created_date: new Date().toISOString(),
            content: "[COMMS LOG] test",
          },
        ]),
      },
      PlayerStatus: {
        filter: vi.fn(async () => []),
      },
    },
    integrations: {
      Core: {
        InvokeLLM: vi.fn(async () => ({
          summary: malicious,
          critical_alerts: [],
        })),
      },
    },
  },
}));

const renderWithClient = (ui) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe("AICommsSummarizer", () => {
  it("renders AI summaries as escaped text", async () => {
    window.__xss = false;

    renderWithClient(<AICommsSummarizer eventId="event-1" />);

    const contentNode = await screen.findByText(malicious);
    expect(contentNode).toBeInTheDocument();
    expect(contentNode.innerHTML).toContain("&lt;script&gt;");
    expect(contentNode.querySelector("script")).toBeNull();
    expect(window.__xss).toBe(false);
  });
});
