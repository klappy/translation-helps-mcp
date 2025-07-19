import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { handler as fetchResourcesHandler } from "./fetch-resources";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Just call the existing fetch-resources API function
  const result = await fetchResourcesHandler(event);
  return result as HandlerResponse;
};
