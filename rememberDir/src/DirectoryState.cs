using System;
using System.Collections.Generic;

namespace rememberDir
{
    public class DirectoryState
    {
        public List<string> Paths { get; set; } = new List<string>();
        public DateTime SavedAt { get; set; } = DateTime.Now;
    }
}
