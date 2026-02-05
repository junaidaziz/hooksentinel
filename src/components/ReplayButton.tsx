"use client";

import { useState } from "react";
import { replayWebhook } from "@/app/actions";

export default function ReplayButton({ webhookId }: { webhookId: string }) {
  const [loading, setLoading] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");

  const handleReplay = async () => {
    if (!targetUrl) {
      alert("Enter a destination URL first (e.g., webhook.site/...)");
      return;
    }
    setLoading(true);
    const result = await replayWebhook(webhookId, targetUrl);
    setLoading(false);

    if (result.success) {
      alert(`✅ Replayed! Status: ${result.status}`);
    } else {
      alert(`❌ Failed: ${result.error}`);
    }
  };

  return (
    <div className="mt-4 flex gap-2 items-center border-t pt-4 border-gray-800">
      <input 
        type="text" 
        placeholder="https://your-api.com/webhook" 
        className="bg-gray-800 text-white text-xs p-2 rounded w-full border border-gray-700"
        value={targetUrl}
        onChange={(e) => setTargetUrl(e.target.value)}
      />
      <button
        onClick={handleReplay}
        disabled={loading}
        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded font-medium disabled:opacity-50"
      >
        {loading ? "Sending..." : "Replay"}
      </button>
    </div>
  );
}