export interface InvalidSyncResponseDetails {
  operation: string;
  reason: string;
  responseKind: string;
  status?: number;
  contentType?: string;
}

export abstract class InvalidSyncResponseError<
  TDetails extends InvalidSyncResponseDetails = InvalidSyncResponseDetails,
> extends Error {
  readonly details: TDetails;

  protected constructor(message: string, name: string, details: TDetails) {
    super(message, { cause: details });
    this.name = name;
    this.details = details;
  }
}
