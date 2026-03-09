import paramiko
import logging
from typing import List

class SFTPClient:
    """
    Módulo encargado exclusivamente de la comunicación segura vía sFTP.
    Aplica principio SoC: Solo se encarga de transferir bytes desde/hacia la red.
    """
    
    def __init__(self, host: str, port: int, username: str, password: str, logger: logging.Logger):
        """
        Inyección de dependencias (DI): Credenciales y el sistema de logging 
        se proveen desde el exterior. No hay valores 'hardcodeados'.
        """
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.logger = logger
        
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.sftp = None

    def connect(self) -> None:
        """
        Establece la conexión con el servidor remoto.
        Levantará excepciones customizadas en caso de intermitencia de red.
        """
        self.logger.info(f"Intentando conectar al sFTP {self.host}:{self.port}")
        try:
            self.client.connect(
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                timeout=30  # Tolerancia a fallos: timeout de conexión
            )
            self.sftp = self.client.open_sftp()
            self.logger.info("Conexión sFTP establecida exitosamente.")
        except Exception as e:
            error_msg = f"Fallo crítico de conexión sFTP: {str(e)}"
            self.logger.error(error_msg)
            raise ConnectionError(error_msg) from e

    def disconnect(self) -> None:
        """Cierra la conexión sFTP activa de manera segura."""
        self.logger.info("Cerrando conexión sFTP.")
        if self.sftp:
            try:
                self.sftp.close()
                self.logger.debug("Sesión sFTP cerrada.")
            except Exception as e:
                self.logger.warning(f"Error al cerrar sftp remoto: {str(e)}")
        
        if self.client:
            try:
                self.client.close()
                self.logger.debug("Cliente SSH cerrado por completo.")
            except Exception as e:
                self.logger.warning(f"Error al cerrar cliente SSH: {str(e)}")

    def list_new_files(self, remote_dir: str) -> List[str]:
        """
        Escanea un directorio remoto e identifica los archivos a procesar.
        """
        self.logger.debug(f"Escaneando directorio remoto: {remote_dir}")
        if not self.sftp:
            self.logger.error("No hay conexión sFTP activa. No se puede listar archivos.")
            raise ConnectionError("Estado de desconexión en listado de archivos.")
            
        try:
            # listdir retorna solo el nombre del archivo
            files = self.sftp.listdir(remote_dir)
            self.logger.info(f"Se encontraron {len(files)} elemento(s) en '{remote_dir}'.")
            return files
        except IOError as e:
            self.logger.error(f"Error IOError al leer directorio '{remote_dir}'. Puede que no exista. Detalle: {str(e)}")
            return []
        except Exception as e:
            self.logger.error(f"Error inesperado al listar en '{remote_dir}': {str(e)}")
            raise

    def download_file(self, remote_path: str, local_path: str) -> bool:
        """
        Descarga archivos protegiendo la integridad y registrando en el logger
        fallos para posterior auditoría.
        """
        self.logger.info(f"Descargando de remoto '{remote_path}' hacia '{local_path}'")
        if not self.sftp:
            self.logger.error("No hay conexión sFTP activa. Falló descarga.")
            return False
            
        try:
            import os
            # Asegurar que el directorio contenedor local exista
            os.makedirs(os.path.dirname(os.path.abspath(local_path)), exist_ok=True)
            
            self.sftp.get(remote_path, local_path)
            self.logger.info(f"Descarga validada en: '{local_path}'")
            return True
        except Exception as e:
            self.logger.error(f"Fallo durante descarga del archivo '{remote_path}': {str(e)}")
            return False
