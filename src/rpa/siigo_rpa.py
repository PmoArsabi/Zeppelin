from pywinauto.application import Application
from pywinauto.timings import TimeoutError as PywinautoTimeoutError
import logging
import time

class SiigoAutomator:
    """
    Módulo experto de extracción de datos (RPA) para interactuar autónomamente con 
    interfaces legacy de Windows mediante pywinauto (UIA o WIN32).
    """
    
    def __init__(self, app_executable_path: str, logger: logging.Logger):
        self.app_executable_path = app_executable_path
        self.logger = logger
        self.app = None
        self.main_window = None

    def start_and_connect(self) -> None:
        """
        Inicia el proceso local o se 'engancha' a uno existente.
        Contempla esperas dinámicas en caso de tiempos de carga impredecibles en OS.
        """
        self.logger.info(f"Levantando proceso SIIGO: {self.app_executable_path}")
        try:
            # Backend recomendado para apps Windows modernas/WPF (uia). 
            # Si SIIGO es muy antiguo (VB6/Delphi), cambiar a backend="win32".
            self.app = Application(backend="uia").start(self.app_executable_path, timeout=20)
            
            # TODO: Ajustar el WindowTitle real de SIIGO cuando esté instalado.
            self.main_window = self.app.window(title_re=".*Siigo.*")
            self.main_window.wait("ready", timeout=30)
            self.logger.info("Aplicación SIIGO enganchada y lista.")
        except Exception as e:
            self.logger.error(f"Error al conectar con SIIGO: {str(e)}")
            raise

    def login(self, username: str, password: str) -> bool:
        """
        Encuentra el 'EditBox' por automation_id o name e introduce datos.
        """
        self.logger.info("Iniciando secuencia de login dinámico en UI...")
        try:
            # 1. Esperar al Dialog de Login
            login_dialog = self.main_window.child_window(title_re=".*Login.*|.*Inicio.*", control_type="Window")
            login_dialog.wait("ready", timeout=20)

            # 2. Inyectar Credenciales (Evitando type_keys que causa typos por latencia)
            # Nota: Los 'auto_id' o 'title' se ajustarán usando Accessibility Insights o Inspect.exe.
            user_input = login_dialog.child_window(auto_id="UsernameTextBox", control_type="Edit")
            pass_input = login_dialog.child_window(auto_id="PasswordTextBox", control_type="Edit")
            
            user_input.set_text(username)
            pass_input.set_text(password)
            
            # 3. Click dinámico en botón Entrar
            btn_login = login_dialog.child_window(title="Entrar", control_type="Button")
            btn_login.click()
            
            self.logger.info("Login ejecutado. Esperando validación de sesión...")
            # Todo: Esperar a que la pantalla de inicio cargue
            time.sleep(5)  # Sleep preventivo mientras la red del legacy autentica
            return True
        except PywinautoTimeoutError:
            self.logger.error("Timeout: La ventana de login nunca apareció.")
            return False
        except Exception as e:
            self.logger.error(f"Fallo crítico en el RPA durante el login: {str(e)}")
            return False

    def navigate_to_reports(self) -> None:
        """Navega a través del árbol de la aplicación hasta la visualización de datos."""
        self.logger.info("Accediendo a modulo de reportes contables.")
        try:
            # Seleccionar menú Contabilidad -> Reportes (Ejemplo de recorrido)
            menu_contabilidad = self.main_window.child_window(title="Contabilidad", control_type="MenuItem")
            menu_contabilidad.click_input()
            
            submenu_reportes = self.main_window.child_window(title="Reportes Contables", control_type="MenuItem")
            submenu_reportes.click_input()
            
            # Esperar a que aparezca la grilla principal
            self.logger.info("Navegación RPA completada.")
        except Exception as e:
            self.logger.error(f"Fallo al navegar por el menú de SIIGO: {str(e)}")
            raise

    def export_financial_report(self, export_path: str) -> bool:
        """
        Interactúa con la ventana estándar de Windows 'Save As'.
        """
        self.logger.info(f"Iniciando exportación RPA hacia: {export_path}")
        try:
            # 1. Click en Botón Exportar Excel
            btn_export = self.main_window.child_window(title_re=".*Exportar.*", control_type="Button")
            btn_export.click()
            
            # 2. Manejar ventana nativa "Save As" (Guardar Como) de Windows
            save_dialog = self.app.window(title="Guardar como")
            save_dialog.wait("ready", timeout=15)
            
            # 3. Escribir ruta absoluta
            filename_edit = save_dialog.child_window(class_name="Edit")
            filename_edit.set_text(export_path)
            
            # 4. Confirmar Guardado
            btn_save = save_dialog.child_window(title="Guardar", control_type="Button")
            btn_save.click()
            
            self.logger.info("Archivo exportado exitosamente mediante RPA.")
            return True
        except Exception as e:
            self.logger.error(f"Error durante exportación de ventana en SIIGO: {str(e)}")
            return False
