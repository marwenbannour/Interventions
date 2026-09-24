import { Role } from '../../common/enums/role.enum';
import { PhotoType } from '../../common/enums/task.enums';

/** Jalons horodatés sur la tâche lorsqu'un état est atteint (sert au calcul SLA). */
export type Milestone =
  | 'PLANNED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE'
  | 'ARRIVED'
  | 'STARTED'
  | 'COMPLETED'
  | 'EVALUATED'
  | 'CANCELLED';

export interface WorkflowState {
  code: string;
  label: string;
  milestone?: Milestone;
  /** État terminal : plus aucune action terrain. */
  final?: boolean;
  /** Visible / actionnable depuis l'application mobile agent. */
  agentVisible?: boolean;
  color?: string;
}

export type WorkflowCondition =
  | { type: 'PHOTO_REQUIRED'; photoType: PhotoType; minCount?: number; validatedOnly?: boolean; message?: string }
  | { type: 'AGENT_ASSIGNED'; message?: string }
  | { type: 'IS_ASSIGNED_AGENT'; message?: string }
  | { type: 'CHECKLIST_COMPLETE'; message?: string }
  | { type: 'COMMENT_REQUIRED'; message?: string }
  | { type: 'GEOFENCE'; radiusMeters?: number; message?: string }
  | { type: 'SIGNATURE_REQUIRED'; message?: string };

export type NotifyTarget = 'SUPERVISORS' | 'ADMINS' | 'CLIENT' | 'AGENT' | 'DIRECTION';

export type WorkflowAction =
  | { type: 'NOTIFY'; targets: NotifyTarget[]; title: string; body: string; channels?: ('PUSH' | 'EMAIL' | 'SMS' | 'IN_APP')[] }
  | { type: 'REQUEST_EVALUATION' }
  | { type: 'UNASSIGN_AGENT' };

export interface WorkflowTransition {
  /** État(s) source ; '*' = tout état non final. */
  from: string | string[];
  to: string;
  label: string;
  /** Rôles autorisés à déclencher la transition. */
  roles: Role[];
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
}

export interface WorkflowDefinitionData {
  initialState: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}
