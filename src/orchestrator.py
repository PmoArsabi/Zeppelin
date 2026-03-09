import os
from dotenv import load_dotenv

from src.utils.logger import setup_logger
from src.sftp.sftp_client import SFTPClient
from src.rpa.siigo_rpa import SiigoAutomator

class ZeppelinOrchestrator:
    """
    Componente central (Controller) que orquesta el ciclo de vida de todos los módulos.
    Realiza la lectura de los secretos iniciales y distribuye las dependencias correctas.
    """
    
    def __init__(self):
        # 1. Cargar secretos locales (Principio Security-First)
        load_dotenv()
        
        # 2. Inicializar sistema de telemetría / Logs centralizado
        self.logger = setup_logger("ZeppelinCore")
        self.logger.info("Sistema Zeppelin inicializando dependencias...")

        # 3. Leer variables en RAM, para luego inyectarlas
        # sFTP
        sftp_host = os.getenv("SFTP_HOST")
        sftp_port = int(os.getenv("SFTP_PORT", 22))
        sftp_user = os.getenv("SFTP_USER", "")
        sftp_pass = os.getenv("SFTP_PASSWORD", "")
        
        # RPA
        siigo_path = os.getenv("SIIGO_EXECUTABLE_PATH")
        self.siigo_user = os.getenv("SIIGO_USER", "")
        self.siigo_pass = os.getenv("SIIGO_PASSWORD", "")

        # 4. Inyección de Dependencias hacia el Módulo SFTP
        self.sftp_module = SFTPClient(
            host=sftp_host,
            port=sftp_port,
            username=sftp_user,
            password=sftp_pass,
            logger=self.logger.getChild("sFTP_Agent")
        )
        
        # 5. Inyección de Dependencias hacia el Módulo RPA Desktop
        self.rpa_module = SiigoAutomator(
            app_executable_path=siigo_path,
            logger=self.logger.getChild("RPA_Agent")
        )

    def execute_pipeline(self):
        """
        Ejecución estructurada paso a paso.
        """
        self.logger.info("=== Iniciando Pipeline Maestro ===")
        
        # A. Extracción en red
        self.sftp_module.connect()
        # lógica descargas sftp
        self.sftp_module.disconnect()

        # B. Extracción Desktop Legacy
        self.rpa_module.start_and_connect()
        self.rpa_module.login(self.siigo_user, self.siigo_pass)
        self.rpa_module.navigate_to_reports()
        self.rpa_module.export_financial_report(r"C:\Temp\salida_siigo.xlsx")

        # C. Transformación y UI Pandas/Streamlit irían aquí (Módulo Core no detallado aún).
        
        self.logger.info("=== Pipeline Completado ===")

if __name__ == "__main__":
    app = ZeppelinOrchestrator()
    # app.execute_pipeline()
