import { protectGameApi } from '../lib/game/api-errors';
import { assetStorageFetch } from "../lib/asset-storage";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    return protectGameApi(request,async()=>{
    const assetResponse = await assetStorageFetch(request, env.BUCKET);
    if (assetResponse) return assetResponse;
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const response=await runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    const type=response.headers.get('Content-Type')||'';
    if(type.includes('text/html')||type.includes('text/x-component')){
      const headers=new Headers(response.headers);headers.set('Cache-Control','private, no-store, max-age=0');headers.set('Pragma','no-cache');headers.set('Expires','0');
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }
    return response;
    });
  },
};

