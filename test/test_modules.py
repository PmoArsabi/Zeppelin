import os
import sys
import pandas as pd
from unittest.mock import patch, MagicMock

# Ajustar PYTHONPATH para los tests
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.utils.logger import setup_logger
from src.core.data_engine import DataStandardizer, ReconciliationEngine, KPIGenerator

def test_engine_architecture():
    logger = setup_logger("Core_Architecture_Test")
    logger.info("=== Evaluando tests de aislamiento en carpeta /test ===")
    
    try:
        kpi_gen = KPIGenerator()
        kpis = kpi_gen.generate_kpis(matched=50, missing_a=5, missing_b=2)
        
        assert kpis["Total_Registros_Evaluados"] == 57
        assert kpis["Discrepancias"] == 7
        
        print("✅ Unit Test (Core-KPI) Superado en /test/test_modules.py")
        
    except AssertionError as e:
        print("❌ Fallo en aserción lógica del Test Unitario.")

if __name__ == "__main__":
    test_engine_architecture()
