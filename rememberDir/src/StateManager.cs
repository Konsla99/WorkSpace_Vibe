using System;
using System.IO;
using Newtonsoft.Json;

namespace rememberDir
{
    public static class StateManager
    {
        private static readonly string AppDataPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "rememberDir"
        );
        private static readonly string StateFilePath = Path.Combine(AppDataPath, "state.json");

        public static void SaveState(DirectoryState state)
        {
            // 폴더가 없으면 생성
            if (!Directory.Exists(AppDataPath))
            {
                Directory.CreateDirectory(AppDataPath);
            }

            // JSON 직렬화
            string json = JsonConvert.SerializeObject(state, Formatting.Indented);
            
            // 파일을 완전히 새로 덮어씁니다 (Overwrite)
            // 에러 발생 시 호출한 쪽(UI)에서 catch할 수 있도록 throw를 허용합니다.
            File.WriteAllText(StateFilePath, json);
        }

        public static DirectoryState LoadState()
        {
            try
            {
                if (File.Exists(StateFilePath))
                {
                    string json = File.ReadAllText(StateFilePath);
                    return JsonConvert.DeserializeObject<DirectoryState>(json) ?? new DirectoryState();
                }
            }
            catch (Exception)
            {
                // 로드 실패 시 새 객체 반환
            }

            return new DirectoryState();
        }
    }
}
