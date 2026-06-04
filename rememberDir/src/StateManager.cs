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
            try
            {
                if (!Directory.Exists(AppDataPath))
                {
                    Directory.CreateDirectory(AppDataPath);
                }

                string json = JsonConvert.SerializeObject(state, Formatting.Indented);
                File.WriteAllText(StateFilePath, json);
            }
            catch (Exception ex)
            {
                // In a real app, we might log this or show a message
                Console.WriteLine($"Error saving state: {ex.Message}");
            }
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
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading state: {ex.Message}");
            }

            return new DirectoryState();
        }
    }
}
