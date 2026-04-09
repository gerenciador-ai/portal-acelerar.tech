// Arquivo: src/app/financeiro/dfc/page.js
"use client";
import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';

// --- DICIONÁRIO EXATO DAS 210 CATEGORIAS VALIDADO PELO USUÁRIO ---
const MAPA_CATEGORIAS_DFC = {
    "Multas Recebidas": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "Juros Recebidos": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "Outras receitas": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "311014001 Receita de Serviços - Mercado Interno": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "311014002 Rec de serviços - Adesão/Implantação": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "000000599 Rec. Estornos": { grupo: "RECEITAS OPERACIONAIS", sinal: -1 },
    "351014901 Lucros e Dividendos de Participações": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "Descontos Recebidos": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "ISS Retido sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "Descontos Concedidos": { grupo: "RECEITAS OPERACIONAIS", sinal: -1 },
    "IRPJ Retido sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "CSLL Retido sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "INSS Retido sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "PIS Retido sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "COFINS Retido sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "Outras Retenções sobre a Receita": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "312054401 Simples Nacional": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "312054403 ( - ) PIS": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "312054404 ( - ) COFINS": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "312054405 ( - ) ISS": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "811019901 IRPJ": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "811019902 CSLL": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "326014504 Materiais - Instalações": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "326014511 Ferramentas Tecnológicas": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "326014512 Suporte e Monitoramento": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "326014513 Depreciação": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "326014514 Amortização": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "312044351 Descontos concedidos": { grupo: "RECEITAS OPERACIONAIS", sinal: -1 },
    "327014701 Salários e Ordenados": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327014702 Pró-Labores": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327014703 Bolsa Estágio": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327014713 Horas Extras": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327014715 Gratificações": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327014717 13ª Salário": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327014718 Férias": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327014729 Outras Remunerações": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327024731 Alimentação e Refeição (VA e VR)": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327024733 Transporte (VT)": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327024735 Seguro Saúde": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327024736 Seguro Odontológico": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327024737 Cursos e Treinamentos": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327024738 Previdência Privada": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327024800 Seguro Estágio": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327034851 Custo INSS": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "327034852 Custo FGTS": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "3213012405 Rescisões a Pagar": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "Multas Pagas": { grupo: "(-) DESPESAS FINANCEIRAS", sinal: 1 },
    "411015001 Salários e Ordenado": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015002 Pró-Labores": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015003 Bolsa Estágio": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015004 Adicional Noturno": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015005 Adicional Insalubridade": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015006 Remuneração - PJ": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015012 Comissões": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015013 Horas Extras": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015014 Aviso Prévio": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015015 Gratificações": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015017 13° Salário": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015018 Férias": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015213 Exame Médico": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015214 Contribuição Sindical": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015215 Rescisões": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015248 Indenizações Trabalhistas": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411015249 Outras Despessas com Pessoal": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411025101 Alimentação e Refeição (VA e VR)": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411025102 Refeição (VR)": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411025103 Transporte (VT)": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411025104 Combustivel (VC)": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411025105 Seguro Saúde - Plano": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411025105 Seguro Saúde (Plano)": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: -1 },
    "411025106 Seguro Odontológico": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411025107 Cursos e Treinamentos": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411025108 Previdência Privada": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411025109 Treinamentos": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411025110 Seguro Estágio": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411035201 Despesa INSS": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411035211 FGTS": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "411035212 FGTS - Multa Rescisão": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015301 Aluguel": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015302 Condomínio": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015303 Água e Esgoto": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015304 Energia Elétrica": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015305 IPTU": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015306 Telefone Fixo e Cel": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015307 Telefone Móvel": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015308 Telefonia e Internet (Celulares, Telefon": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015309 Material de Escritório": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015310 Mat de Limpeza, Conserv, Manut e Seg": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015311 Material de Copa e Cozinha": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015312 Gráfica Cópias, Impressões, Encadernação": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015313 Correios e Couriers": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015314 Assinaturas (Livros, Jornais e revistas)": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015315 Estacionamentos": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015316 Taxi, Uber, Cabify": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015317 Combustível": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015318 Brindes": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015319 Passagens Aéreas": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015320 Passagens Terrestres": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015321 Lanches e Refeições": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015322 Hospedagem e Estadias": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015372 Cartório": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015379 Taxas e Contribuições": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015380 Multas": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015381 Despesas Bancárias": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015331 Bens Natureza Permanente": { grupo: "(+/-) FLUXO DE INVESTIMENTO (FCI)", sinal: 1 },
    "412015332 Depreciação": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015333 Amortização": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015335 Locação de Veículos": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015336 Seguros": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015337 Pedágios": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015375 Associação de Classe": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015378 Taxas e Emolumentos": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412015398 Outras Despesas Operacionais": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412026410 Serviços Contábeis": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412026411 Serviços Jurídicos": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412026413 Serviços Auditoria": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412026414 Serviços de Publicação": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412026415 Serviços de Coworking": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412026417 Serviços de Manut., Reparos e Limpeza": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412026418 Serviços de APP e Sofwares": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412026421 Serviços de Consultoria": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412026433 Serviços de Transportes": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "412026435 Serviços PJ - Diversos": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "000000599 Pgtos. Estornos": { grupo: "(-) DESPESAS FINANCEIRAS", sinal: 1 },
    "413016501 Salários e Ordenados": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016502 Pró-Labores": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016503 Bolsa Estágio": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016504 Adicional Noturno": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016505 Adicional Insalubridade": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016506 Remuneração PJ": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016512 Comissões": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016513 Horas Extras": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016514 Aviso Prévio": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016515 Gratificações": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016517 13º Salário Comercial": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016518 Férias": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016548 Outras Indenizações Trabalhistas": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413016549 Outras Despesas com Pessoal": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056708 Telefonia e Internet Comercial": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413026601 Alimentação e Refeição (VA e VR)": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413026602 Transporte (VT)": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413026605 Plano de Saúde": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413026606 Plano Odonto": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413026607 Cursos e Treinamentos": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413026608 Previdência Privada": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413026610 Seguro Estágio": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413036651 INSS Empresa": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413036661 FGTS": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413036662 FGTS - Multa Rescisão": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056701 Taxi, Uber, Cabify": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056717 Combustível": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056718 Brindes": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056719 Passagens Aéreas": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056722 Hospedagens e Estadias": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056735 Locação de Veículos": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056737 Pedágios": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056801 Assessoria em Marketing": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056802 Assessoria de Imprensa": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056903 - Feiras, Congressos e eventos": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056918 - Apps e Softwares Comerciais": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "413056919 - Lanches e Refeições": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "415017001 Receita Financeira": { grupo: "(-) DESPESAS FINANCEIRAS", sinal: -1 },
    "415017002 Descontos Obtidos": { grupo: "(-) DESPESAS FINANCEIRAS", sinal: -1 },
    "415027102 Juros": { grupo: "(-) DESPESAS FINANCEIRAS", sinal: 1 },
    "Juros Pagos": { grupo: "(-) DESPESAS FINANCEIRAS", sinal: 1 },
    "415027106 Anuidade Cartão de Crédito": { grupo: "(-) DESPESAS FINANCEIRAS", sinal: 1 },
    "415027109 IOF": { grupo: "(-) DESPESAS FINANCEIRAS", sinal: 1 },
    "415027110 Variação Monetária Passiva": { grupo: "(-) DESPESAS FINANCEIRAS", sinal: 1 },
    "511018001 Ganho na Alienação de Bens": { grupo: "(+/-) FLUXO DE INVESTIMENTO (FCI)", sinal: -1 },
    "511028031 Ganhos com Equivalência Patrimonial": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "415017011 IRRF Rendimento Financeiros": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "911019999 Resultado do Exercício": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "Pagamento de ISS Retido": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "Pagamento de IRPJ Retido": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "Pagamento de CSLL Retido": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "Pagamento de INSS Retido": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "Pagamento de PIS Retido": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "Pagamento de Cofins Retido": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "Pagamento de Outras retenções": { grupo: "(-) IMPOSTOS SOBRE VENDAS", sinal: 1 },
    "ISS Retido sobre Pagamentos": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "IRPJ Retido sobre Pagamentos": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "CSLL Retido sobre Pagamentos": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "INSS Retido sobre Pagamentos": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "PIS Retido sobre Pagamentos": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "COFINS Retido sobre Pagamentos": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "Outras Retenções sobre Pagamentos": { grupo: "RECEITAS OPERACIONAIS", sinal: 1 },
    "510003101 Dividendos Pagos": { grupo: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", sinal: 1 },
    "510003101 Dividendos Devolvidos": { grupo: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", sinal: -1 },
    "215012941 Obrig. com Pessoas Ligadas (GRT)": { grupo: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", sinal: 1 },
    "413016550 Outras Despesas com Pessoal": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "215012942 Obrig. com Pessoas Ligadas-Lucas Vianna": { grupo: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", sinal: -1 },
    "215012943 Obrig. com Pessoas Ligadas (VMC TECH)": { grupo: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", sinal: -1 },
    "510003100 Sittax - Licença de Uso": { grupo: "(+/-) FLUXO DE INVESTIMENTO (FCI)", sinal: 1 },
    "510003103 Fusões e aquisições (SSX)": { grupo: "(+/-) FLUXO DE INVESTIMENTO (FCI)", sinal: 1 },
    "Custo meio de pagamento": { grupo: "(-) DESPESAS FINANCEIRAS", sinal: 1 },
    "215012942 Obrig. com Pessoas Ligadas (GRT)": { grupo: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", sinal: -1 },
    "327034853 Repasse Sittax": { grupo: "(-) CUSTOS OPERACIONAIS (TIME 32)", sinal: 1 },
    "413056721 - Lanches e Refeições": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "510003102 Aporte dos Sócios": { grupo: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", sinal: -1 },
    "Categoria indefinida": { grupo: "(-) DESPESAS FINANCEIRAS", sinal: 1 },
    "111030153 Tì. Cap. Santander": { grupo: "(+/-) FLUXO DE INVESTIMENTO (FCI)", sinal: 1 },
    "211133011 Empréstimo Banco Itaú (Amortização)": { grupo: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", sinal: 1 },
    "213012402 Pró-Labores a Pagar": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "217013051 Empréstimo Santander (Amortização)": { grupo: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", sinal: 1 },
    "217013051 Empréstimo Santander (Entrada)": { grupo: "(+/-) FLUXO DE FINANCIAMENTO (FCF)", sinal: -1 },
    "412036620 Taxas e Contribuições": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "413056901 Assessoria em Mkt": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 },
    "4213012405 Rescisões a Pagar": { grupo: "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)", sinal: 1 },
    "413016549 Outras Indenizações Trabalhistas": { grupo: "(-) DESPESAS COMERCIAIS (TIME 413)", sinal: 1 }
};

const LINHAS_DFC = [
    "RECEITAS OPERACIONAIS",
    "(-) IMPOSTOS SOBRE VENDAS",
    "(=) RECEITA LÍQUIDA",
    "(-) CUSTOS OPERACIONAIS (TIME 32)",
    "(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)",
    "(-) DESPESAS COMERCIAIS (TIME 413)",
    "(=) FLUXO OPERACIONAL (FCO)",
    "(+/-) FLUXO DE INVESTIMENTO (FCI)",
    "(+/-) FLUXO DE FINANCIAMENTO (FCF)",
    "(-) DESPESAS FINANCEIRAS",
    "(=) SALDO LÍQUIDO DO PERÍODO"
];

function EmpresaTab({ nome, logo, isActive, onClick }) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-3 px-6 py-3 transition-all duration-200 border-b-2 ${
                isActive 
                ? 'border-acelerar-light-blue bg-white/5 text-white' 
                : 'border-transparent text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
        >
            {logo && <Image src={`/${logo}`} alt={nome} width={24} height={24} className={isActive ? 'opacity-100' : 'opacity-40'} />}
            <span className="text-sm font-medium uppercase tracking-wider">{nome}</span>
        </button>
    );
}

export default function DFCPage() {
    const [empresaAtiva, setEmpresaAtiva] = useState(null);
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(false);
    const [visao, setVisao] = useState('Mensal');
    const [anoAtivo, setAnoAtivo] = useState(2026);

    useEffect(() => {
        if (empresaAtiva && empresaAtiva !== 'Consolidado') {
            carregarDados();
        }
    }, [empresaAtiva, anoAtivo]);

    const carregarDados = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/financeiro/dfc?empresa=${empresaAtiva}`);
            const data = await res.json();
            setDados(data);
        } catch (error) {
            console.error('Erro ao carregar DFC:', error);
        } finally {
            setLoading(false);
        }
    };

    const processarDFC = useMemo(() => {
        if (!dados || !dados.fluxo) return null;

        const matriz = {};
        LINHAS_DFC.forEach(linha => {
            matriz[linha] = Array(12).fill(0);
        });

        // Ordenação por data para garantir cronologia
        const fluxoOrdenado = [...dados.fluxo].sort((a, b) => new Date(a.data) - new Date(b.data));

        fluxoOrdenado.forEach(item => {
            const data = new Date(item.data + 'T12:00:00'); // Força meio-dia para evitar erro de fuso
            const mes = data.getMonth();
            const ano = data.getFullYear();

            if (ano !== anoAtivo) return;

            // BUSCA EXATA PELO NOME DA CATEGORIA QUE VOCÊ PASSOU
            const classificacao = MAPA_CATEGORIAS_DFC[item.categoria] || { grupo: "(-) DESPESAS FINANCEIRAS", sinal: 1 };
            const valor = parseFloat(item.valor) * (classificacao.sinal || 1);
            
            if (matriz[classificacao.grupo]) {
                matriz[classificacao.grupo][mes] += valor;
            }
        });

        // Cálculos de Totais
        for (let m = 0; m < 12; m++) {
            matriz["(=) RECEITA LÍQUIDA"][m] = matriz["RECEITAS OPERACIONAIS"][m] - matriz["(-) IMPOSTOS SOBRE VENDAS"][m];
            
            matriz["(=) FLUXO OPERACIONAL (FCO)"][m] = 
                matriz["(=) RECEITA LÍQUIDA"][m] - 
                matriz["(-) CUSTOS OPERACIONAIS (TIME 32)"][m] - 
                matriz["(-) DESPESAS ADMINISTRATIVAS (TIME 411/412)"][m] - 
                matriz["(-) DESPESAS COMERCIAIS (TIME 413)"][m];

            matriz["(=) SALDO LÍQUIDO DO PERÍODO"][m] = 
                matriz["(=) FLUXO OPERACIONAL (FCO)"][m] - 
                matriz["(+/-) FLUXO DE INVESTIMENTO (FCI)"][m] - 
                matriz["(+/-) FLUXO DE FINANCIAMENTO (FCF)"][m] - 
                matriz["(-) DESPESAS FINANCEIRAS"][m];
        }

        return matriz;
    }, [dados, anoAtivo]);

    const formatarMoeda = (valor) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(valor);
    };

    const renderTabelaMensal = () => {
        const matriz = processarDFC;
        if (!matriz) return null;

        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

        return (
            <div className="overflow-x-auto rounded-xl border border-white/10 bg-acelerar-dark-blue/50 backdrop-blur-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-white/5">
                            <th className="p-4 text-xs font-semibold text-white/50 uppercase border-b border-white/10">Categoria</th>
                            {meses.map(m => (
                                <th key={m} className="p-4 text-xs font-semibold text-white/50 uppercase border-b border-white/10 text-right">{m}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {LINHAS_DFC.map((linha) => {
                            const isTotal = linha.startsWith('(=)');
                            return (
                                <tr key={linha} className={`hover:bg-white/5 transition-colors ${isTotal ? 'bg-acelerar-light-blue/10 font-bold' : ''}`}>
                                    <td className={`p-4 text-sm ${isTotal ? 'text-acelerar-light-blue' : 'text-white/80'}`}>{linha}</td>
                                    {matriz[linha].map((valor, mIdx) => (
                                        <td key={mIdx} className={`p-4 text-sm text-right ${valor < 0 && !isTotal ? 'text-red-400' : 'text-white'}`}>
                                            {formatarMoeda(valor)}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-acelerar-dark-blue p-8 space-y-8">
            <div className="flex items-center justify-between border-b border-white/10">
                <div className="flex">
                    <EmpresaTab nome="Consolidado" logo="logo_acelerar_login.png" isActive={empresaAtiva === 'Consolidado'} onClick={() => setEmpresaAtiva('Consolidado')} />
                    <EmpresaTab nome="VMC Tech" logo="logo_vmctech.png" isActive={empresaAtiva === 'VMC Tech'} onClick={() => setEmpresaAtiva('VMC Tech')} />
                    <EmpresaTab nome="Victec" logo="logo_victec.png" isActive={empresaAtiva === 'Victec'} onClick={() => setEmpresaAtiva('Victec')} />
                </div>

                {empresaAtiva && (
                    <div className="flex items-center gap-4">
                        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                            <button onClick={() => setVisao('Mensal')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${visao === 'Mensal' ? 'bg-acelerar-light-blue text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>Mensal</button>
                            <button onClick={() => setVisao('Diário')} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${visao === 'Diário' ? 'bg-acelerar-light-blue text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>Diário</button>
                        </div>
                        <select value={anoAtivo} onChange={(e) => setAnoAtivo(parseInt(e.target.value))} className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-acelerar-light-blue">
                            <option value={2026}>Ano: 2026</option>
                        </select>
                        {dados?.conciliadoAte && (
                            <div className="bg-yellow-500/10 border border-yellow-500/30 px-4 py-1.5 rounded-lg">
                                <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">Conciliado até {new Date(dados.conciliadoAte + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {!empresaAtiva ? (
                <div className="flex-1 flex flex-col items-center justify-center text-white/20 space-y-4">
                    <div className="w-16 h-16 border-2 border-white/5 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <p className="text-sm font-medium uppercase tracking-widest">Selecione uma empresa na aba acima para visualizar o DFC.</p>
                </div>
            ) : (
                <div className="flex-1 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="w-8 h-8 border-2 border-acelerar-light-blue border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-xs text-white/40 font-medium uppercase tracking-widest">Processando dados do Nibo...</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-in fade-in duration-500">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-acelerar-light-blue rounded-full"></span>
                                Demonstrativo de Fluxo de Caixa - {empresaAtiva}
                            </h3>
                            {renderTabelaMensal()}
                            <p className="text-[10px] text-white/30 italic uppercase tracking-wider">* Dados consolidados por correspondência exata das categorias do Nibo com o Plano de Contas 2026.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
