using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;

namespace rememberDir
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }

        private void OnSaveClick(object sender, RoutedEventArgs e)
        {
            try
            {
                var paths = GetOpenExplorerPaths();
                if (paths.Count == 0)
                {
                    StatusText.Text = "열려 있는 탐색기 창이 없습니다.";
                    return;
                }

                var state = new DirectoryState { Paths = paths };
                StateManager.SaveState(state);
                StatusText.Text = $"{paths.Count}개의 경로가 기록되었습니다.";
            }
            catch (Exception ex)
            {
                StatusText.Text = $"기록 중 오류: {ex.Message}";
            }
        }

        private async void OnRestoreClick(object sender, RoutedEventArgs e)
        {
            try
            {
                var state = StateManager.LoadState();
                if (state.Paths == null || state.Paths.Count == 0)
                {
                    StatusText.Text = "기록된 경로가 없습니다.";
                    return;
                }

                StatusText.Text = "경로 복원 중...";
                await RestorePaths(state.Paths);
                StatusText.Text = "복원이 완료되었습니다.";
            }
            catch (Exception ex)
            {
                StatusText.Text = $"복원 중 오류: {ex.Message}";
            }
        }

        private List<string> GetOpenExplorerPaths()
        {
            var paths = new List<string>();
            
            try
            {
                Type? shellAppType = Type.GetTypeFromProgID("Shell.Application");
                if (shellAppType == null) return paths;

                dynamic shellApp = Activator.CreateInstance(shellAppType)!;
                dynamic windows = shellApp.Windows();

                for (int i = 0; i < windows.Count; i++)
                {
                    try
                    {
                        dynamic window = windows.Item(i);
                        if (window == null) continue;

                        string fullName = "";
                        try { fullName = window.FullName; } catch { continue; }

                        if (Path.GetFileNameWithoutExtension(fullName).ToLower() == "explorer")
                        {
                            dynamic doc = window.Document;
                            if (doc != null)
                            {
                                string path = doc.Folder.Self.Path;
                                if (!string.IsNullOrEmpty(path) && Directory.Exists(path))
                                {
                                    paths.Add(path);
                                }
                            }
                        }
                    }
                    catch (Exception)
                    {
                        // 개별 창 처리 중 오류는 무시하고 계속 진행
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error getting paths: {ex.Message}");
            }

            return paths.Distinct().ToList();
        }

        private async Task RestorePaths(List<string> paths)
        {
            if (paths == null || paths.Count == 0) return;

            // 1. 첫 번째 경로를 열어 기본 창 생성
            string firstPath = paths[0];
            if (Directory.Exists(firstPath))
            {
                Process.Start("explorer.exe", $"\"{firstPath}\"");
            }

            if (paths.Count == 1) return;

            // 창이 열리고 안정될 때까지 대기
            await Task.Delay(2000);

            // 2. 나머지 경로들을 탭으로 추가 (Windows 11 전용 로직)
            for (int i = 1; i < paths.Count; i++)
            {
                string path = paths[i];
                if (!Directory.Exists(path)) continue;

                try
                {
                    // SendKeys를 사용하기 위해 System.Windows.Forms.SendKeys를 명시적으로 호출합니다.
                    // New Tab (Ctrl + T)
                    System.Windows.Forms.SendKeys.SendWait("^{t}");
                    await Task.Delay(1000);

                    // 주소창 포커스 (Alt + D)
                    System.Windows.Forms.SendKeys.SendWait("%d");
                    await Task.Delay(500);

                    // 경로 입력 및 엔터
                    System.Windows.Forms.SendKeys.SendWait(path + "{ENTER}");
                    await Task.Delay(1000);
                }
                catch (Exception)
                {
                    // 실패 시 다음 경로 시도
                }
            }
        }
    }
}
