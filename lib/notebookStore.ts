import {
  CleanedParticipant,
  PairedParticipant,
  AttritionAnalysis,
  JupyterExecutionResult
} from '@/types/dataset';

export interface DatasetBundle {
  sessionId: string;
  updatedAt: string;
  preClean: CleanedParticipant[];
  postClean: CleanedParticipant[];
  pairedData: PairedParticipant[];
  quarantined: CleanedParticipant[];
  attritionAnalysis: AttritionAnalysis | null;
}

declare global {
  var __reportthy_dataset_bundle: DatasetBundle | undefined;
  var __reportthy_jupyter_result: JupyterExecutionResult | undefined;
}

export function saveServerDatasetBundle(bundle: {
  sessionId?: string;
  preClean: CleanedParticipant[];
  postClean: CleanedParticipant[];
  pairedData: PairedParticipant[];
  quarantined: CleanedParticipant[];
  attritionAnalysis?: AttritionAnalysis | null;
}): DatasetBundle {
  const fullBundle: DatasetBundle = {
    sessionId: bundle.sessionId || 'current-workspace',
    updatedAt: new Date().toISOString(),
    preClean: bundle.preClean || [],
    postClean: bundle.postClean || [],
    pairedData: bundle.pairedData || [],
    quarantined: bundle.quarantined || [],
    attritionAnalysis: bundle.attritionAnalysis || null,
  };
  global.__reportthy_dataset_bundle = fullBundle;
  return fullBundle;
}

export function getServerDatasetBundle(): DatasetBundle | null {
  return global.__reportthy_dataset_bundle ?? null;
}

export function saveServerJupyterResult(res: JupyterExecutionResult): void {
  global.__reportthy_jupyter_result = res;
}

export function getServerJupyterResult(): JupyterExecutionResult | null {
  return global.__reportthy_jupyter_result ?? null;
}
