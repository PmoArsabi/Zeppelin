import sys
import os
import pandas as pd
from PySide6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                               QHBoxLayout, QPushButton, QLabel, QFileDialog, 
                               QGroupBox, QTableWidget, QTableWidgetItem, QHeaderView,
                               QMessageBox)
from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtGui import QFont, QIcon, QColor

sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from src.core.data_engine import DataStandardizer, ReconciliationEngine, KPIGenerator
from src.utils.logger import setup_logger

logger = setup_logger("PySide6_UI")

class WorkerReconciliation(QThread):
    """
    Hilo de trabajo para evitar que la UI pesada se congele mientras Pandas procesa
    miles de registros de datos financieros.
    """
    finished = Signal(dict, pd.DataFrame, pd.DataFrame, pd.DataFrame)
    error = Signal(str)

    def __init__(self, df_a, df_b, merge_keys):
        super().__init__()
        self.df_a = df_a
        self.df_b = df_b
        self.merge_keys = merge_keys

    def run(self):
        try:
            standardizer = DataStandardizer(logger)
            recon_engine = ReconciliationEngine(logger)
            kpi_gen = KPIGenerator()

            # Estándar Core Engine
            self.df_a.columns = [str(x).strip().upper().replace(" ", "_") for x in self.df_a.columns]
            self.df_b.columns = [str(x).strip().upper().replace(" ", "_") for x in self.df_b.columns]

            # Reconciliación 
            conciliados, solo_a, solo_b = recon_engine.reconcile(self.df_a, self.df_b, self.merge_keys)
            
            # Generar KPIs
            kpis = kpi_gen.generate_kpis(len(conciliados), len(solo_a), len(solo_b))
            
            # Emitir resultados
            self.finished.emit(kpis, conciliados, solo_a, solo_b)

        except Exception as e:
            self.error.emit(str(e))


class ZeppelinMainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Zeppelin - Conciliación Financiera (Desktop)")
        self.setMinimumSize(1000, 700)
        
        # Atributos de archivos
        self.file_a_path = None
        self.file_b_path = None
        self.df_a = None
        self.df_b = None
        
        self._setup_ui()
        self._apply_dark_theme()

    def _setup_ui(self):
        # Widget Central y Layout Base
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)

        # Panel Lateral (Controles)
        sidebar_layout = QVBoxLayout()
        sidebar_layout.setContentsMargins(10, 10, 10, 10)
        sidebar_layout.setSpacing(15)
        
        title_label = QLabel("🚁 ZEPPELIN CORE")
        title_label.setFont(QFont("Segoe UI", 16, QFont.Bold))
        sidebar_layout.addWidget(title_label)
        
        # Grupo: Automation Control
        group_rpa = QGroupBox("Automatización (RPA)")
        rpa_layout = QVBoxLayout()
        self.btn_run_pipeline = QPushButton("▶ Iniciar Extracción Total")
        self.btn_run_pipeline.setMinimumHeight(40)
        rpa_layout.addWidget(self.btn_run_pipeline)
        group_rpa.setLayout(rpa_layout)
        sidebar_layout.addWidget(group_rpa)
        
        # Grupo: Archivos Manuales Locales (Simulador)
        group_sim = QGroupBox("Carga Local Manual")
        sim_layout = QVBoxLayout()
        
        self.btn_load_a = QPushButton("Cargar Fuente A (Banco/sFTP)")
        self.lbl_path_a = QLabel("Ningún archivo...")
        self.lbl_path_a.setWordWrap(True)
        self.btn_load_a.clicked.connect(lambda: self.load_file('a'))
        
        self.btn_load_b = QPushButton("Cargar Fuente B (SIIGO Local)")
        self.lbl_path_b = QLabel("Ningún archivo...")
        self.lbl_path_b.setWordWrap(True)
        self.btn_load_b.clicked.connect(lambda: self.load_file('b'))
        
        self.btn_reconcile = QPushButton("Ejecutar Conciliación Local")
        self.btn_reconcile.setMinimumHeight(40)
        self.btn_reconcile.setEnabled(False)
        self.btn_reconcile.clicked.connect(self.start_reconciliation)
        
        sim_layout.addWidget(self.btn_load_a)
        sim_layout.addWidget(self.lbl_path_a)
        sim_layout.addWidget(self.btn_load_b)
        sim_layout.addWidget(self.lbl_path_b)
        sim_layout.addWidget(self.btn_reconcile)
        group_sim.setLayout(sim_layout)
        
        sidebar_layout.addWidget(group_sim)
        sidebar_layout.addStretch()

        # Workspace Area
        workspace_layout = QVBoxLayout()
        
        # Tarjetas de KPI
        self.kpi_layout = QHBoxLayout()
        self.lbl_kpi_total = self._create_kpi_card("Registros", "0")
        self.lbl_kpi_match = self._create_kpi_card("Conciliados", "0", "#00FF87")
        self.lbl_kpi_diff = self._create_kpi_card("Discrepancias", "0", "#FF4B4B")
        self.lbl_kpi_rate = self._create_kpi_card("Efectividad", "0%", "#FEA100")
        
        workspace_layout.addLayout(self.kpi_layout)
        
        # Tabla de Detalles (Viewport principal)
        self.details_table = QTableWidget(0, 0)
        self.details_table.setAlternatingRowColors(True)
        self.details_table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.details_table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        
        workspace_layout.addWidget(QLabel("Vista Previa de Datos / Resultados:"), 0)
        workspace_layout.addWidget(self.details_table, 1)

        # Ensamblando al Layout Principal
        main_layout.addLayout(sidebar_layout, 1)
        main_layout.addLayout(workspace_layout, 4)

    def _create_kpi_card(self, title, value, color="#00F2FE"):
        group = QGroupBox()
        layout = QVBoxLayout()
        
        lbl_val = QLabel(value)
        lbl_val.setFont(QFont("Segoe UI", 24, QFont.Bold))
        lbl_val.setStyleSheet(f"color: {color};")
        lbl_val.setAlignment(Qt.AlignCenter)
        
        lbl_title = QLabel(title)
        lbl_title.setFont(QFont("Segoe UI", 10))
        lbl_title.setStyleSheet("color: #A0AEC0;")
        lbl_title.setAlignment(Qt.AlignCenter)
        
        layout.addWidget(lbl_val)
        layout.addWidget(lbl_title)
        group.setLayout(layout)
        self.kpi_layout.addWidget(group)
        return lbl_val

    def _apply_dark_theme(self):
        """Aplicar estética moderna tipo Dark Mode"""
        self.setStyleSheet("""
            QMainWindow, QWidget {
                background-color: #0E1117;
                color: #FFFFFF;
                font-family: 'Segoe UI';
            }
            QGroupBox {
                border: 1px solid #2D3748;
                border-radius: 8px;
                margin-top: 15px;
                background-color: #1A202C;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px;
                color: #CBD5E0;
            }
            QPushButton {
                background-color: #2B6CB0;
                color: white;
                border-radius: 4px;
                padding: 8px;
                font-weight: bold;
            }
            QPushButton:hover { background-color: #3182CE; }
            QPushButton:disabled { background-color: #4A5568; color: #A0AEC0; }
            QTableWidget {
                background-color: #1A202C;
                alternate-background-color: #2D3748;
                gridline-color: #4A5568;
                border: 1px solid #2D3748;
            }
            QHeaderView::section {
                background-color: #2D3748;
                padding: 4px;
                font-weight: bold;
            }
        """)

    def load_file(self, target):
        file_path, _ = QFileDialog.getOpenFileName(self, f"Seleccionar Fuente {target.upper()}", "", "Data Files (*.csv *.xls *.xlsx)")
        
        if file_path:
            try:
                # Cargar directamente a DF en memoria para validar
                if file_path.endswith('.csv'):
                    df = pd.read_csv(file_path)
                else:
                    df = pd.read_excel(file_path)
                    
                if target == 'a':
                    self.file_a_path = file_path
                    self.df_a = df
                    self.lbl_path_a.setText(os.path.basename(file_path))
                else:
                    self.file_b_path = file_path
                    self.df_b = df
                    self.lbl_path_b.setText(os.path.basename(file_path))

                # Habilitar botón si ambos existen
                if self.file_a_path and self.file_b_path:
                    self.btn_reconcile.setEnabled(True)
                    
            except Exception as e:
                QMessageBox.critical(self, "Error de Lectura", f"No se pudo leer el archivo: {e}")

    def start_reconciliation(self):
        self.btn_reconcile.setEnabled(False)
        self.btn_reconcile.setText("Procesando...")
        
        # Inicializando Worker Thread
        self.worker = WorkerReconciliation(self.df_a, self.df_b, merge_keys=["ID_TRANSACCION"])
        self.worker.finished.connect(self.on_reconciliation_finished)
        self.worker.error.connect(self.on_reconciliation_error)
        self.worker.start()

    def on_reconciliation_finished(self, kpis, df_match, df_solo_a, df_solo_b):
        # Actualizando UI de Tarjetas
        self.lbl_kpi_total.setText(str(kpis['Total_Registros_Evaluados']))
        self.lbl_kpi_match.setText(str(kpis['Registros_Conciliados']))
        self.lbl_kpi_diff.setText(str(kpis['Discrepancias']))
        self.lbl_kpi_rate.setText(f"{kpis['Tasa_Efectividad']}%")
        
        # Volcando Dataframe Match a la grilla nativa QT
        self._populate_table(df_match)
        
        # Reset visual
        self.btn_reconcile.setEnabled(True)
        self.btn_reconcile.setText("Ejecutar Conciliación Local")
        QMessageBox.information(self, "Éxito", "La conciliación finalizó correctamente.")

    def on_reconciliation_error(self, err_msg):
        self.btn_reconcile.setEnabled(True)
        self.btn_reconcile.setText("Ejecutar Conciliación Local")
        QMessageBox.critical(self, "Error del Motor Core", err_msg)

    def _populate_table(self, df):
        self.details_table.clear()
        if df.empty:
            self.details_table.setRowCount(0)
            self.details_table.setColumnCount(0)
            return
            
        self.details_table.setColumnCount(len(df.columns))
        self.details_table.setRowCount(len(df))
        self.details_table.setHorizontalHeaderLabels(df.columns)

        for i in range(len(df)):
            for j in range(len(df.columns)):
                item = QTableWidgetItem(str(df.iloc[i, j]))
                self.details_table.setItem(i, j, item)

def main():
    app = QApplication(sys.argv)
    window = ZeppelinMainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
