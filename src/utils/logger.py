import logging
import os
from datetime import datetime

def setup_logger(name: str) -> logging.Logger:
    """
    Configura y retorna un logger estandarizado para la aplicación.
    Guarda los registros a nivel de sistema de archivos (rotación diaria).
    Crucial para auditoría y observabilidad del comportamiento RPA/sFTP.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        
        # Crear directorio de logs centralizado
        os.makedirs("logs", exist_ok=True)
        log_filename = f"logs/app_{datetime.now().strftime('%Y-%m-%d')}.log"
        
        # Formato detallado de log
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
        )
        
        # File Handler (INFO hacia arriba para auditoría)
        file_handler = logging.FileHandler(log_filename, encoding='utf-8')
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(formatter)
        
        # Console Handler (DEBUG de desarrollo)
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(formatter)
        
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)
        
    return logger
