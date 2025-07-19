import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from "@netlify/functions";
import { handler as getLanguagesHandler } from "./get-languages";

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
): Promise<HandlerResponse> => {
  // Just call the existing get-languages API function
  const result = await getLanguagesHandler(event, context);
  return result as HandlerResponse;
};
