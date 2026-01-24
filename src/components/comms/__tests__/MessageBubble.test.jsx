import React from "react";
import { render, screen } from "@testing-library/react";
import MessageBubble from "@/components/comms/MessageBubble";

describe("MessageBubble", () => {
  it("renders message content as escaped text", () => {
    const malicious = "<script>window.__xss = true</script>";
    window.__xss = false;

    render(
      <MessageBubble
        message={{ content: malicious, created_date: new Date().toISOString() }}
        author={{ callsign: "Echo", full_name: "Echo One", rank: "LT" }}
        isMe={false}
        isOnline={false}
        isRead={false}
        onlineUsers={[]}
      />
    );

    const contentNode = screen.getByText(malicious);
    expect(contentNode).toBeInTheDocument();
    expect(contentNode.innerHTML).toContain("&lt;script&gt;");
    expect(contentNode.querySelector("script")).toBeNull();
    expect(window.__xss).toBe(false);
  });
});
