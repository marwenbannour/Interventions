export interface Evaluation {
  id: string;
  createdAt: string;
  taskId: string;
  taskReference: string;
  taskTitle: string;
  agentId: string | null;
  authorId: string;
  rating: number;
  punctualityRating: number | null;
  qualityRating: number | null;
  comment: string | null;
}

export interface EvaluationQuery {
  agentId?: string;
  clientId?: string;
  taskId?: string;
  page?: number;
  limit?: number;
}
