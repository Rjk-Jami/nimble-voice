export enum CEFRLevel {
  ALL = "ALL",
  ANY = "ANY",
  A1 = "A1",
  A2 = "A2",
  B1 = "B1",
  B2 = "B2",
  C1 = "C1",
  C2 = "C2",
  NATIVE = "NATIVE",
}

export const CEFR_LABELS: Record<CEFRLevel, string> = {
  [CEFRLevel.ALL]: "All Levels Welcome",
  [CEFRLevel.ANY]: "All Levels Welcome",
  [CEFRLevel.A1]: "Beginner A1",
  [CEFRLevel.A2]: "Elementary A2",
  [CEFRLevel.B1]: "Intermediate B1",
  [CEFRLevel.B2]: "Upper-Intermediate B2",
  [CEFRLevel.C1]: "Advanced C1",
  [CEFRLevel.C2]: "Mastery C2",
  [CEFRLevel.NATIVE]: "Native Speakers",
};
