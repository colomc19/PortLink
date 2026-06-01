export interface ParsedTime {
  time: string | null; // HH:MM format or null
  timeEnd: string | null; // End of range or null
  confidence: "exact" | "range" | "approximate" | "unknown";
  status: string | null; // 'anchor', 'pilot', 'boarded', 'docked', etc.
  raw: string; // Original text
}

export interface ParsedRow {
  rawVesselName: string;
  rawDate: string | null;
  rawTimeStatus: string | null;
  rawTerminal: string | null;
  rawAgent: string | null;
  rawNotes: string | null;
  section: "arrivals" | "sailings";
  parsedDate: string | null; // YYYY-MM-DD
  parsedTime: ParsedTime;
  needsReview: boolean;
  reviewReason: string | null;
}

export interface ParseResult {
  reportDate: string | null; // YYYY-MM-DD
  rows: ParsedRow[];
  errors: string[];
}
