export type EstadoIntegracao = "ok" | "alerta" | "desconhecido" | "futuro"

export type PassoRastreabilidade = {
  id: string
  titulo: string
  descricao: string
  estado: EstadoIntegracao
  detalhe?: string
}

export type EntradaRastreabilidade = {
  statusSellent: string | null
  erpNumero: string | null
  erpRecusa: string | null
  temNota: boolean
  temOperacaoInterna: boolean
}

export function montarPassosRastreabilidade(entrada: EntradaRastreabilidade): PassoRastreabilidade[] {
  const erp = passoErp(entrada.erpNumero, entrada.erpRecusa)
  const nota = passoNota(entrada.temNota, entrada.statusSellent)
  return [
    {
      id: "sellent",
      titulo: "Sellent",
      descricao: "Pedido e aprovação comercial",
      estado: entrada.statusSellent ? "ok" : "desconhecido",
      detalhe: entrada.statusSellent ?? "Sem status",
    },
    erp,
    {
      id: "sifn",
      titulo: "ERP SIFN",
      descricao: "Processamento fiscal e estoque",
      estado: "desconhecido",
      detalhe: "Sem leitura direta nesta entrega",
    },
    nota,
    {
      id: "operacao",
      titulo: "Operação interna",
      descricao: "Etapas por SKU (substituto Monday)",
      estado: entrada.temOperacaoInterna ? "ok" : "desconhecido",
      detalhe: entrada.temOperacaoInterna ? "SKU em acompanhamento" : "Não aberta",
    },
    {
      id: "wms",
      titulo: "WMS",
      descricao: "Separação e expedição",
      estado: "futuro",
      detalhe: "Integração futura",
    },
    {
      id: "monday",
      titulo: "Monday",
      descricao: "Quadro operacional externo",
      estado: "futuro",
      detalhe: "Integração futura",
    },
  ]
}

function passoErp(erpNumero: string | null, erpRecusa: string | null): PassoRastreabilidade {
  const recusa = erpRecusa?.trim()
  if (recusa) {
    return {
      id: "erp",
      titulo: "Integração ERP",
      descricao: "Número ou recusa na réplica Sellent",
      estado: "alerta",
      detalhe: recusa.slice(0, 120),
    }
  }
  const numero = erpNumero?.trim()
  if (numero && /^\d+$/.test(numero)) {
    return {
      id: "erp",
      titulo: "Integração ERP",
      descricao: "Número ou recusa na réplica Sellent",
      estado: "ok",
      detalhe: `Nº ${numero}`,
    }
  }
  if (numero) {
    return {
      id: "erp",
      titulo: "Integração ERP",
      descricao: "Número ou recusa na réplica Sellent",
      estado: "alerta",
      detalhe: numero.slice(0, 120),
    }
  }
  return {
    id: "erp",
    titulo: "Integração ERP",
    descricao: "Número ou recusa na réplica Sellent",
    estado: "desconhecido",
    detalhe: "Sem número na réplica",
  }
}

function passoNota(temNota: boolean, statusSellent: string | null): PassoRastreabilidade {
  const faturado = (statusSellent ?? "").toUpperCase().includes("INVOICE-ATIVO")
  if (temNota) {
    return {
      id: "nota",
      titulo: "Nota fiscal",
      descricao: "Documento na réplica (BI Sellent)",
      estado: "ok",
      detalhe: "Nota registrada",
    }
  }
  if (faturado) {
    return {
      id: "nota",
      titulo: "Nota fiscal",
      descricao: "Documento na réplica (BI Sellent)",
      estado: "alerta",
      detalhe: "Status faturado no Sellent sem nota na réplica",
    }
  }
  return {
    id: "nota",
    titulo: "Nota fiscal",
    descricao: "Documento na réplica (BI Sellent)",
    estado: "desconhecido",
    detalhe: "Ainda sem nota",
  }
}
