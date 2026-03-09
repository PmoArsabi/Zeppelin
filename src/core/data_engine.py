import pandas as pd
import logging
from typing import Tuple, Dict, Any

class DataStandardizer:
    """
    Responsable de cargar, limpiar y homogeneizar los datasets provenientes 
    de fuentes dispares (ej. SFTP vs SIIGO RPA).
    
    Aplica principio Single Responsibility (SRP): Solo limpia y estandariza.
    """
    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def load_and_clean(self, file_path: str, source_name: str) -> pd.DataFrame:
        """
        Carga un archivo (CSV/Excel) y aplica limpieza básica dinámica.
        """
        self.logger.info(f"Cargando dataset '{source_name}' desde: {file_path}")
        try:
            # Determinación simple por extensión
            if file_path.lower().endswith(".csv"):
                df = pd.read_csv(file_path)
            elif file_path.lower().endswith((".xls", ".xlsx")):
                df = pd.read_excel(file_path)
            else:
                raise ValueError("Formato de archivo no soportado. Se espera CSV o Excel.")
                
            # Limpieza universal
            df.columns = [str(col).strip().upper().replace(" ", "_") for col in df.columns]
            self.logger.debug(f"Columnas estandarizadas para {source_name}: {df.columns.tolist()}")
            
            # Remover duplicados totales
            initial_len = len(df)
            df.drop_duplicates(inplace=True)
            if initial_len > len(df):
                self.logger.warning(f"Se removieron {initial_len - len(df)} filas duplicadas en {source_name}.")
                
            return df
        except Exception as e:
            self.logger.error(f"Error procesando el archivo '{file_path}': {str(e)}")
            raise

class ReconciliationEngine:
    """
    Núcleo del negocio: Compara los DataFrames estandarizados para encontrar
    registros conciliados (coinciden en ambas fuentes) y discrepancias.
    """
    def __init__(self, logger: logging.Logger):
        self.logger = logger

    def reconcile(self, df_source_a: pd.DataFrame, df_source_b: pd.DataFrame, merge_keys: list) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Realiza el cruce de datos ('Join') para determinar estado de conciliación.
        
        Args:
            df_source_a: DataFrame del sistema A (ej. Archivos sFTP)
            df_source_b: DataFrame del sistema B (ej. Reporte contable SIIGO)
            merge_keys: Lista con los nombres de las columnas que sirven como llave primaria.
            
        Returns:
            Tuple con: (df_conciliados, df_solo_en_A, df_solo_en_B)
        """
        self.logger.info(f"Iniciando conciliación usando llaves: {merge_keys}")
        
        # Validar existencia de llaves
        for key in merge_keys:
            if key not in df_source_a.columns or key not in df_source_b.columns:
                error_msg = f"Llave crítica '{key}' ausente en uno de los datasets."
                self.logger.critical(error_msg)
                raise KeyError(error_msg)
                
        # Proceso de 'Outer Join' con indicador
        merged = pd.merge(df_source_a, df_source_b, on=merge_keys, how="outer", indicator=True)
        
        df_conciliados = merged[merged['_merge'] == 'both'].drop(columns=['_merge'])
        df_solo_en_a = merged[merged['_merge'] == 'left_only'].drop(columns=['_merge'])
        df_solo_en_b = merged[merged['_merge'] == 'right_only'].drop(columns=['_merge'])
        
        self.logger.info(f"Conciliación Finalizada: "
                         f"Conciliados={len(df_conciliados)} | "
                         f"Faltantes en B={len(df_solo_en_a)} | "
                         f"Faltantes en A={len(df_solo_en_b)}")
                         
        return df_conciliados, df_solo_en_a, df_solo_en_b

class KPIGenerator:
    """
    Genera métricas clave (KPIs) a partir de los resultados de la conciliación.
    Estos KPIs alimentarán al Módulo UI (Streamlit) sin atar la interfaz al cálculo matemático.
    """
    def generate_kpis(self, matched: int, missing_a: int, missing_b: int) -> Dict[str, Any]:
        """Calcula los indicadores financieros/operativos."""
        total_records = matched + missing_a + missing_b
        
        kpis = {
            "Total_Registros_Evaluados": total_records,
            "Registros_Conciliados": matched,
            "Discrepancias": missing_a + missing_b,
            "Tasa_Efectividad": round((matched / total_records * 100) if total_records > 0 else 0, 2),
            "Faltantes_en_Fuente_Local": missing_b,
            "Faltantes_en_Fuente_Remota": missing_a
        }
        return kpis
