export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      chamados_etapas: {
        Row: {
          chamado_id: string
          created_at: string
          dias_uteis_previsto: number | null
          dias_uteis_real: number | null
          dt_fim: string | null
          dt_inicio: string | null
          id: string
          nome_tarefa: string
          ordem: number
          sla_status: string | null
          tarefa_id: string | null
          updated_at: string
        }
        Insert: {
          chamado_id: string
          created_at?: string
          dias_uteis_previsto?: number | null
          dias_uteis_real?: number | null
          dt_fim?: string | null
          dt_inicio?: string | null
          id?: string
          nome_tarefa: string
          ordem?: number
          sla_status?: string | null
          tarefa_id?: string | null
          updated_at?: string
        }
        Update: {
          chamado_id?: string
          created_at?: string
          dias_uteis_previsto?: number | null
          dias_uteis_real?: number | null
          dt_fim?: string | null
          dt_inicio?: string | null
          id?: string
          nome_tarefa?: string
          ordem?: number
          sla_status?: string | null
          tarefa_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_etapas_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados_faltas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_etapas_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados_faltas: {
        Row: {
          cd: string | null
          chamado: string | null
          conferente: string | null
          created_at: string
          dt_abertura: string | null
          dt_emissao: string | null
          dt_finalizacao: string | null
          dt_pagamento: string | null
          id: string
          loja: string | null
          motivo: string | null
          nf: string | null
          periodo: string | null
          situacao: string | null
          sla_status: string | null
          status_chamado: string | null
          status_pagamento: string | null
          tipo: string | null
          transportadora: string | null
          updated_at: string
          valor: number | null
        }
        Insert: {
          cd?: string | null
          chamado?: string | null
          conferente?: string | null
          created_at?: string
          dt_abertura?: string | null
          dt_emissao?: string | null
          dt_finalizacao?: string | null
          dt_pagamento?: string | null
          id?: string
          loja?: string | null
          motivo?: string | null
          nf?: string | null
          periodo?: string | null
          situacao?: string | null
          sla_status?: string | null
          status_chamado?: string | null
          status_pagamento?: string | null
          tipo?: string | null
          transportadora?: string | null
          updated_at?: string
          valor?: number | null
        }
        Update: {
          cd?: string | null
          chamado?: string | null
          conferente?: string | null
          created_at?: string
          dt_abertura?: string | null
          dt_emissao?: string | null
          dt_finalizacao?: string | null
          dt_pagamento?: string | null
          id?: string
          loja?: string | null
          motivo?: string | null
          nf?: string | null
          periodo?: string | null
          situacao?: string | null
          sla_status?: string | null
          status_chamado?: string | null
          status_pagamento?: string | null
          tipo?: string | null
          transportadora?: string | null
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      chamados_referencias: {
        Row: {
          chamado_id: string
          cor: string | null
          created_at: string
          descricao: string | null
          fornecedor: string | null
          id: string
          quantidade: number | null
          referencia: string | null
          tamanho: string | null
          updated_at: string
        }
        Insert: {
          chamado_id: string
          cor?: string | null
          created_at?: string
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          quantidade?: number | null
          referencia?: string | null
          tamanho?: string | null
          updated_at?: string
        }
        Update: {
          chamado_id?: string
          cor?: string | null
          created_at?: string
          descricao?: string | null
          fornecedor?: string | null
          id?: string
          quantidade?: number | null
          referencia?: string | null
          tamanho?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_referencias_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados_faltas"
            referencedColumns: ["id"]
          },
        ]
      }
      conferentes: {
        Row: {
          cd: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          cd?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          cd?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      lojas: {
        Row: {
          agencia: string | null
          agencia_dig: string | null
          banco: string | null
          cnpj: string | null
          conta: string | null
          conta_dig: string | null
          created_at: string
          id: string
          numero: string
          observacao: string | null
          razao_social: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          agencia_dig?: string | null
          banco?: string | null
          cnpj?: string | null
          conta?: string | null
          conta_dig?: string | null
          created_at?: string
          id?: string
          numero: string
          observacao?: string | null
          razao_social?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          agencia_dig?: string | null
          banco?: string | null
          cnpj?: string | null
          conta?: string | null
          conta_dig?: string | null
          created_at?: string
          id?: string
          numero?: string
          observacao?: string | null
          razao_social?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      motivos: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          cor: string
          created_at: string
          descricao: string | null
          id: string
          nome_parceiro: string | null
          referencia: string
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome_parceiro?: string | null
          referencia: string
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome_parceiro?: string | null
          referencia?: string
          updated_at?: string
        }
        Relationships: []
      }
      tarefas_catalogo: {
        Row: {
          aplica_faltas: boolean
          aplica_sobras: boolean
          ativo: boolean
          created_at: string
          dias_uteis: number
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          aplica_faltas?: boolean
          aplica_sobras?: boolean
          ativo?: boolean
          created_at?: string
          dias_uteis?: number
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          aplica_faltas?: boolean
          aplica_sobras?: boolean
          ativo?: boolean
          created_at?: string
          dias_uteis?: number
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      transportadoras: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
