import os
import sys
import pandas as pd

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.utils.logger import setup_logger
from src.core.data_engine import DataStandardizer, ReconciliationEngine, KPIGenerator

def generate_dummy_data():
    """Crea dos archivos CSV locales de prueba imitando la entrada de sFTP y SIIGO"""
    os.makedirs("test_downloads", exist_ok=True)
    
    # Fuente A (Ej. Archivo del Banco via sFTP)
    data_a = {
        "ID_TRANSACCION": ["TX001", "TX002", "TX003", "TX004", "TX005"],
        "MONTO": [100.5, 200.0, 150.0, 300.2, 50.0]
    }
    df_a = pd.DataFrame(data_a)
    df_a.to_csv("test_downloads/fuente_a.csv", index=False)
    
    # Fuente B (Ej. Reporte Contable de SIIGO RPA)
    # NOTA: TX003 no está, y hay una TX006 nueva
    data_b = {
        "id Transaccion ": ["TX001", "TX002", "TX004", "TX005", "TX006"],
        " monto ": [100.5, 200.0, 300.2, 50.0, 99.9]
    }
    df_b = pd.DataFrame(data_b)
    df_b.to_csv("test_downloads/fuente_b.csv", index=False)

def test_core_engine():
    logger = setup_logger("Core_Test")
    logger.info("=== Iniciando Prueba Unitaria de Core Engine ===")
    
    generate_dummy_data()
    
    # Instancias
    standardizer = DataStandardizer(logger)
    recon_engine = ReconciliationEngine(logger)
    kpi_gen = KPIGenerator()
    
    try:
        # 1. Estandarización
        logger.info("Fase 1: Estandarización de Archivos")
        df_a = standardizer.load_and_clean("test_downloads/fuente_a.csv", "sFTP_Bank")
        df_b = standardizer.load_and_clean("test_downloads/fuente_b.csv", "SIIGO_RPA")
        
        # 2. Conciliación
        logger.info("Fase 2: Cruce de Datos (Reconciliation)")
        # Observe cómo ambos DF ahora tienen la columna ID_TRANSACCION gracias al limpiador
        conciliados, solo_a, solo_b = recon_engine.reconcile(df_a, df_b, merge_keys=["ID_TRANSACCION"])
        
        # 3. Generación KPI
        logger.info("Fase 3: Cálculo de KPIs")
        kpis = kpi_gen.generate_kpis(len(conciliados), len(solo_a), len(solo_b))
        
        print("\n=== RESULTADOS DEL MOTOR CORE ===")
        print(f"Total Registros Procesados: {kpis['Total_Registros_Evaluados']}")
        print(f"✅ Conciliados: {kpis['Registros_Conciliados']}")
        print(f"⚠️ Discrepancias Totales: {kpis['Discrepancias']}")
        print(f"   -> Faltantes en RPA local: {kpis['Faltantes_en_Fuente_Local']}")
        print(f"   -> Faltantes en sFTP externo: {kpis['Faltantes_en_Fuente_Remota']}")
        print(f"📈 Efectividad de Match: {kpis['Tasa_Efectividad']}%")
        print("=================================\n")
        
    except Exception as e:
        logger.error(f"Falla en prueba: {str(e)}")
        print(f"❌ ERROR: {str(e)}")
    finally:
        logger.info("=== Prueba Unitaria de Core Finalizada ===\n")

if __name__ == "__main__":
    test_core_engine()
