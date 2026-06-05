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
        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

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
                    StatusText.Text = "기록할 수 있는 탐색기 경로를 찾지 못했습니다.";
                    return;
                }

                var state = new DirectoryState { Paths = paths, SavedAt = DateTime.Now };
                StateManager.SaveState(state);
                
                StatusText.Text = $"{DateTime.Now:HH:mm:ss} - {paths.Count}개의 경로가 기록되었습니다.";
            }
            catch (Exception ex)
            {
                StatusText.Text = $"기록 실패: {ex.Message}";
                System.Windows.MessageBox.Show($"저장 중 오류가 발생했습니다:\n{ex.Message}", "오류", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void OnRestoreClick(object sender, RoutedEventArgs e)
        {
            try
            {
                var state = StateManager.LoadState();
                if (state.Paths == null || state.Paths.Count == 0)
                {
                    StatusText.Text = "불러올 기록이 없습니다.";
                    return;
                }

                StatusText.Text = "경로 복원 시작...";
                await RestorePaths(state.Paths);
                StatusText.Text = "모든 경로 복원이 완료되었습니다.";
            }
            catch (Exception ex)
            {
                StatusText.Text = $"복원 실패: {ex.Message}";
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
                int count = 0;
                try { count = windows.Count; } catch { }

                // 인덱스 기반으로 모든 창을 순회 (Windows 11 탭 포함)
                for (int i = 0; i < count; i++)
                {
                    try
                    {
                        dynamic window = windows.Item(i);
                        if (window == null) continue;

                        string fullName = "";
                        try { fullName = (string)window.FullName; } catch { }

                        // 탐색기 프로세스인지 확인
                        bool isExplorer = string.IsNullOrEmpty(fullName) || 
                                          Path.GetFileNameWithoutExtension(fullName).ToLower() == "explorer";

                        if (isExplorer)
                        {
                            string path = "";
                            
                            // 1. Document 객체로부터 경로 추출
                            try
                            {
                                dynamic doc = window.Document;
                                if (doc != null)
                                {
                                    path = (string)doc.Folder.Self.Path;
                                }
                            }
                            catch { }

                            // 2. LocationURL로부터 경로 추출 (Document 실패 시 대비)
                            if (string.IsNullOrEmpty(path))
                            {
                                try
                                {
                                    string url = (string)window.LocationURL;
                                    if (!string.IsNullOrEmpty(url) && url.StartsWith("file:///"))
                                    {
                                        path = new Uri(url).LocalPath;
                                    }
                                }
                                catch { }
                            }

                            if (!string.IsNullOrEmpty(path) && Directory.Exists(path))
                            {
                                paths.Add(path);
                            }
                        }
                    }
                    catch { }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Error: {ex.Message}");
            }

            // 중복 경로 제거 및 정렬
            return paths.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        }

        private async Task RestorePaths(List<string> paths)
        {
            if (paths == null || paths.Count == 0) return;

            var validPaths = paths.Where(p => Directory.Exists(p)).ToList();
            if (validPaths.Count == 0) return;

            // 1. 첫 번째 경로 실행
            Process.Start("explorer.exe", $"\"{validPaths[0]}\"");

            if (validPaths.Count == 1) return;

            // 첫 번째 창 로딩 대기 (충분한 시간 부여)
            await Task.Delay(3500);

            // 2. 나머지 경로 탭으로 추가
            for (int i = 1; i < validPaths.Count; i++)
            {
                try
                {
                    StatusText.Text = $"복원 중 ({i + 1}/{validPaths.Count}): {Path.GetFileName(validPaths[i])}";
                    
                    // 탐색기 창을 활성화하기 위해 HWND 찾기 시도
                    IntPtr explorerHwnd = FindExplorerHwnd(validPaths[0]);
                    if (explorerHwnd != IntPtr.Zero)
                    {
                        SetForegroundWindow(explorerHwnd);
                        await Task.Delay(300);
                    }

                    // 새 탭 열기 (Ctrl+T)
                    System.Windows.Forms.SendKeys.SendWait("^{t}");
                    await Task.Delay(1200);

                    // 주소창 포커스 (Alt+D)
                    System.Windows.Forms.SendKeys.SendWait("%d");
                    await Task.Delay(600);

                    // 경로 입력 및 엔터
                    string escapedPath = EscapeSendKeys(validPaths[i]);
                    System.Windows.Forms.SendKeys.SendWait(escapedPath + "{ENTER}");
                    
                    // 다음 탭 열기 전 대기 (충분한 시간 부여)
                    await Task.Delay(2000);
                }
                catch { }
            }
        }

        private IntPtr FindExplorerHwnd(string anchorPath)
        {
            try
            {
                Type? shellAppType = Type.GetTypeFromProgID("Shell.Application");
                if (shellAppType == null) return IntPtr.Zero;

                dynamic shellApp = Activator.CreateInstance(shellAppType)!;
                dynamic windows = shellApp.Windows();
                int count = 0;
                try { count = windows.Count; } catch { }

                for (int i = 0; i < count; i++)
                {
                    try
                    {
                        dynamic window = windows.Item(i);
                        if (window == null) continue;

                        string path = (string)window.Document.Folder.Self.Path;
                        if (string.Equals(path, anchorPath, StringComparison.OrdinalIgnoreCase))
                        {
                            return (IntPtr)window.HWND;
                        }
                    }
                    catch { }
                }
            }
            catch { }
            return IntPtr.Zero;
        }

        private string EscapeSendKeys(string text)
        {
            if (string.IsNullOrEmpty(text)) return text;
            
            // SendKeys 특수문자: + ^ % ~ ( ) { }
            // 이 문자들을 { }로 감싸주어야 문자 그대로 입력됨
            var sb = new System.Text.StringBuilder();
            foreach (char c in text)
            {
                if ("+^%~(){}".Contains(c))
                {
                    sb.Append("{" + c + "}");
                }
                else
                {
                    sb.Append(c);
                }
            }
            return sb.ToString();
        }
    }
}
