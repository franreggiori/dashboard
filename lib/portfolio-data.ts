export const AÑOS = [2020, 2021, 2022, 2023, 2024] as const;
export type Año = typeof AÑOS[number];

export const RETORNOS: Record<string, Record<Año, number>> = {
  "SPY":                                 { 2020: 18.33,  2021: 28.73,  2022: -18.18, 2023: 26.17,  2024: 24.89  },
  "QQQ":                                 { 2020: 48.60,  2021: 27.42,  2022: -32.58, 2023: 54.85,  2024: 25.58  },
  "EEM (ETF Emerging Markets)":          { 2020: 18.31,  2021: -4.59,  2022: -20.09, 2023: 7.02,   2024: 7.96   },
  "Neuberguer Global Equity MEGATRENDS": { 2020: 22.50,  2021: 14.80,  2022: -24.20, 2023: 23.50,  2024: 17.80  },
  "GAINVEST RENTA FIJA DOLAR":           { 2020: 5.70,   2021: 5.70,   2022: 5.70,   2023: 5.70,   2024: 5.70   },
  "OBLIGACIONES NEGOCIABLES":            { 2020: 6.00,   2021: 6.00,   2022: 6.00,   2023: 6.00,   2024: 6.00   },
  "PIMCO INCOME FUND":                   { 2020: 4.50,   2021: 1.80,   2022: -3.20,  2023: 7.10,   2024: 6.50   },
  "BARINGS PRIVATE CREDIT":              { 2020: 7.20,   2021: 9.80,   2022: 10.50,  2023: 12.10,  2024: 11.50  },
  "BARINGS GLOBAL SECURES BONDS":        { 2020: 6.80,   2021: 4.90,   2022: -8.20,  2023: 10.50,  2024: 9.20   },
  "GOLD":                                { 2020: 24.81,  2021: -4.15,  2022: -0.77,  2023: 12.69,  2024: 26.66  },
};

export const ASSET_DESCRIPTIONS: Record<string, string> = {
  "SPY": "SPDR S&P 500 ETF Trust. Replica el índice S&P 500, compuesto por las 500 principales empresas de EE.UU. por capitalización bursátil. Es el ETF de mayor volumen del mundo y referencia del mercado accionario americano.",
  "QQQ": "Invesco QQQ Trust. Replica el Nasdaq-100, compuesto por las 100 mayores empresas no financieras del Nasdaq. Alta concentración en tecnología: Apple, Microsoft, NVIDIA, Amazon y Meta representan más del 40% del índice.",
  "EEM (ETF Emerging Markets)": "iShares MSCI Emerging Markets ETF. Brinda exposición diversificada a acciones de economías emergentes incluyendo China, India, Taiwan, Corea del Sur y Brasil. Instrumento idóneo para capturar el crecimiento de mercados en desarrollo.",
  "Neuberguer Global Equity MEGATRENDS": "Neuberger Berman Global Equity Megatrends (IE00BFMHRM44). Fondo activo de renta variable global que invierte en compañías beneficiarias de tendencias estructurales a largo plazo: digitalización, cambio demográfico y transición energética.",
  "GAINVEST RENTA FIJA DOLAR": "Fondo de renta fija en dólares con perfil conservador, orientado a la preservación del capital mediante inversiones en instrumentos de deuda de alta calidad crediticia. Rendimiento estimado estable del 5.7% anual.",
  "OBLIGACIONES NEGOCIABLES": "Bonos corporativos emitidos por empresas argentinas denominados en dólares. Ofrecen flujos de pagos de capital e intereses preestablecidos. Rendimiento estimado del 6% anual sobre la base de condiciones de mercado históricas.",
  "PIMCO INCOME FUND": "PIMCO Low Duration Income Fund (IE00BDT57T44). Fondo de renta fija de corta duración gestionado por PIMCO, uno de los mayores administradores de renta fija del mundo. Invierte en bonos con grado de inversión con foco en preservación de capital y generación de ingresos.",
  "BARINGS PRIVATE CREDIT": "Barings Private Credit Corporation (XS2658535799). Fondo de crédito privado que otorga financiamiento directo a empresas medianas. Ofrece retornos potencialmente superiores al crédito público con baja correlación con los mercados de capitales cotizados.",
  "BARINGS GLOBAL SECURES BONDS": "Barings Global Secured Bonds (IE00BK71B469). Fondo de high yield global con foco en deuda corporativa garantizada (secured). Busca equilibrar rendimiento y protección del capital mediante activos respaldados por garantías reales.",
  "GOLD": "Oro (futuros GC=F). Activo refugio por excelencia con más de 5.000 años de historia como reserva de valor. Históricamente preserva poder adquisitivo en escenarios de inflación, incertidumbre geopolítica y debilitamiento del dólar estadounidense.",
};
