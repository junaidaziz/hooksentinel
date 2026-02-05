import { auth } from "@clerk/nextjs/server";
import { getWebhooks } from "./actions";
import ReplayButton from "@/components/ReplayButton";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { userId } = auth();

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to HookSentinel</h1>
          <p className="mt-4 text-gray-600">Please sign in to view your webhooks.</p>
        </div>
      </main>
    );
  }

  const webhooks = await getWebhooks(userId);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const webhookUrl = `${apiUrl}/inbox/${userId}`;

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">HookSentinel</h1>
          <div className="text-sm text-gray-500">
            Inbox: <span className="font-mono bg-gray-200 px-2 py-1 rounded">{webhookUrl}</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">Recent Deliveries</h2>
          </div>
          
          <div className="divide-y divide-gray-100">
            {webhooks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No webhooks received yet. Send a POST request!
              </div>
            ) : (
              webhooks.map((hook: any) => (
                <div key={hook.GSI1PK} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        hook.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : 'bg-gray-100'
                      }`}>
                        {hook.status}
                      </span>
                      <span className="text-sm font-mono text-gray-500">
                        {hook.method}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(hook.receivedAt).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="bg-gray-900 rounded p-4 overflow-x-auto mt-3">
                    <pre className="text-xs text-green-400 font-mono">
                      {JSON.stringify(JSON.parse(hook.payload), null, 2)}
                    </pre>
                    <ReplayButton webhookId={hook.GSI1PK} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}