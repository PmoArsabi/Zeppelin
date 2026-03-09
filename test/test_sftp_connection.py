import os
import sys
from dotenv import load_dotenv

# Añadir el directorio 'src' al sys.path para importaciones
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.utils.logger import setup_logger
from src.sftp.sftp_client import SFTPClient

def test_sftp_connection():
    # Cargar variables de entorno estipuladas en el .env
    load_dotenv()
    
    # Inicializar el logger
    logger = setup_logger("SFTP_Test")
    
    host = os.getenv("SFTP_HOST")
    port = int(os.getenv("SFTP_PORT", 22))
    user = os.getenv("SFTP_USER")
    password = os.getenv("SFTP_PASSWORD")
    
    logger.info("=== Iniciando Prueba Unitaria SFTP ===")
    
    # Inyectar dependencias al cliente
    client = SFTPClient(host, port, user, password, logger)
    
    remote_file = "Subidas/test_entrega.txt"
    local_file = "test_downloads/test_entrega.txt"
    
    try:
        # 1. Probar conexión
        client.connect()
        
        # 2. Listar archivos remotos en el directorio (opcional, para mapeo)
        remote_dir = "Subidas"
        logger.info(f"Listando contenido del directorio remoto '{remote_dir}'...")
        archivos = client.list_new_files(remote_dir)
        print(f"\n--- Archivos encontrados en {remote_dir} ---")
        for archivo in archivos:
            print(f"- {archivo}")
        print("-------------------------------------------\n")
        
        # 3. Intentar realizar la descarga del archivo exacto que pidió el usuario
        exito = client.download_file(remote_file, local_file)
        
        if exito and os.path.exists(local_file):
            print(f"✅ EXITO: El archivo fue descargado correctamente en {os.path.abspath(local_file)}")
            print("Contenido del archivo:")
            print("=========================================")
            with open(local_file, "r", encoding="utf-8", errors="ignore") as f:
                print(f.read())
            print("=========================================")
        else:
            print("❌ FALLO: No se pudo descargar el archivo.")
            
    except Exception as e:
        logger.error(f"Error en la ejecución de la prueba: {str(e)}")
        print(f"❌ ERROR CRÍTICO: {str(e)}")
    finally:
        client.disconnect()
        logger.info("=== Prueba Unitaria Finalizada ===")

if __name__ == "__main__":
    test_sftp_connection()
