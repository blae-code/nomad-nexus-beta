import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import DMTab from "@/components/messaging/DMTab";

const malicious = "<script>window.__xss = true</script>";

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      Channel: {
        filter: vi.fn(async () => [{ id: "channel-1" }]),
        create: vi.fn(),
      },
      Message: {
        filter: vi.fn(async () => [
          {
            id: "message-1",
            user_id: "user-2",
            content: malicious,
            attachments: [],
          },
        ]),
        subscribe: vi.fn(() => () => {}),
        create: vi.fn(),
      },
    },
    integrations: {
      Core: {
        UploadFile: vi.fn(),
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

describe("DMTab", () => {
  it("renders DM content as escaped text", async () => {
    window.__xss = false;

    renderWithClient(
      <DMTab
        user={{ id: "user-1", callsign: "Nova" }}
        recipientId="user-2"
        recipientName="Orbit"
      />
    );

    const contentNode = await screen.findByText(malicious);
    expect(contentNode).toBeInTheDocument();
    expect(contentNode.innerHTML).toContain("&lt;script&gt;");
    expect(contentNode.querySelector("script")).toBeNull();
    expect(window.__xss).toBe(false);
  });
});
