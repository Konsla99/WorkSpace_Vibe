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

                // 모든 창을 순회 (Windows 11 탭 포함)
                for (int i = 0; i < count; i++)
                {
                    try
                    {
                        dynamic window = windows.Item(i);
                        if (window == null) continue;

                        string fullName = "";
                        try { fullName = (string)window.FullName; } catch { }
                        
                        string name = "";
                        try { name = (string)window.Name; } catch { }

                        // 탐색기 프로세스인지 더 넓은 범위로 확인
                        bool isExplorer = fullName.ToLower().Contains("explorer.exe") || 
                                          name.Contains("Explorer") || 
                                          name.Contains("탐색기") ||
                                          string.IsNullOrEmpty(fullName);

                        if (isExplorer)
                        {
                            string path = "";
                            
                            // 1. Document 객체로부터 경로 추출 (가장 정확함)
                            try
                            {
                                if (window.Document != null && window.Document.Folder != null)
                                {
                                    path = (string)window.Document.Folder.Self.Path;
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

                            // 3. LocationName 확인 (특수 폴더 등 대비)
                            if (string.IsNullOrEmpty(path))
                            {
                                try
                                {
                                    string locName = (string)window.LocationName;
                                    if (Directory.Exists(locName))
                                    {
                                        path = locName;
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
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"Window Item Error: {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"Shell Access Error: {ex.Message}");
            }

            // 중복 경로 제거 및 정렬
            return paths.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        }

        private async Task RestorePaths(List<string> paths)
        {
            if (paths == null || paths.Count == 0) return;

            var validPaths = paths.Where(p => Directory.Exists(p)).ToList();
            if (validPaths.Count == 0) return;

            StatusText.Text = "탐색기를 실행 중입니다. 잠시만 기다려주세요...";
            
            // 1. 첫 번째 경로 실행
            Process.Start("explorer.exe", $"\"{validPaths[0]}\"");

            if (validPaths.Count == 1)
            {
                await Task.Delay(1000);
                StatusText.Text = "복원이 완료되었습니다.";
                return;
            }

            // 첫 번째 창이 완전히 로드될 때까지 대기
            await Task.Delay(3000);

            // 2. 나머지 경로 복원
            for (int i = 1; i < validPaths.Count; i++)
            {
                try
                {
                    StatusText.Text = $"복원 중 ({i + 1}/{validPaths.Count}): {Path.GetFileName(validPaths[i])}\n(복원 중에는 다른 창을 클릭하셔도 안전합니다)";

                    // 새 탭 생성 (이 부분은 API가 없어 Ctrl+T 사용이 불가피함)
                    IntPtr explorerHwnd = FindExplorerHwnd(validPaths[0]);
                    if (explorerHwnd != IntPtr.Zero)
                    {
                        SetForegroundWindow(explorerHwnd);
                        await Task.Delay(100);
                    }
                    
                    System.Windows.Forms.SendKeys.SendWait("^{t}");
                    
                    // 새 탭 객체가 ShellWindows 컬렉션에 등록될 때까지 대기
                    await Task.Delay(800);

                    // 새로 생성된 탭 객체를 찾아 Navigate2 호출 (키보드 입력 없음)
                    await NavigateNewTab(validPaths[i]);
                }
                catch (Exception ex)
                {
                    Debug.WriteLine($"Restore Error at {i}: {ex.Message}");
                }
            }

            StatusText.Text = "모든 경로 복원이 완료되었습니다.";
        }

        private async Task NavigateNewTab(string targetPath)
        {
            try
            {
                Type? shellAppType = Type.GetTypeFromProgID("Shell.Application");
                if (shellAppType == null) return;

                dynamic shellApp = Activator.CreateInstance(shellAppType)!;
                
                // 여러 번 시도하여 새로 생성된 빈 탭을 포착
                for (int retry = 0; retry < 10; retry++)
                {
                    dynamic windows = shellApp.Windows();
                    int count = 0;
                    try { count = windows.Count; } catch { }

                    for (int i = 0; i < count; i++)
                    {
                        try
                        {
                            dynamic window = windows.Item(i);
                            if (window == null) continue;

                            string currentPath = "";
                            try { currentPath = (string)window.Document.Folder.Self.Path; } catch { }

                            // 탭이 생성된 직후에는 보통 경로가 비어있거나 특정 기본값임
                            if (string.IsNullOrEmpty(currentPath) || 
                                currentPath.StartsWith("::") || 
                                currentPath.Equals(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), StringComparison.OrdinalIgnoreCase))
                            {
                                // COM Navigate2 호출 (백그라운드에서 메모리 주입 방식으로 이동)
                                window.Navigate2(targetPath);
                                return; 
                            }
                        }
                        catch { }
                    }
                    await Task.Delay(400); 
                }
            }
            catch { }
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
