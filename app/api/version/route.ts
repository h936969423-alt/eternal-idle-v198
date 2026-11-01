import {APP_BUILD} from '../../build-id';
export const dynamic='force-dynamic';
/** Public and cheap: only the build id of the code this server runs. */
export async function GET(){return Response.json({build:APP_BUILD},{headers:{'cache-control':'no-store'}});}
