using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SchoolERPWebConsole.Domain
{
    public class SmsGatewayTemplate
    {
        public string SmsType { get; set; } = "";
        public string HttpMethod { get; set; } = "POST";
        public string RequestUrl { get; set; } = "";
        public string ContentType { get; set; } = "application/json";
        public Dictionary<string, string> Headers { get; set; } = new();
        public Dictionary<string, string> BodyParams { get; set; } = new();
        public List<string> BodyArrayParams { get; set; } = new();
        public string? SuccessPath { get; set; }
        public string? SuccessValue { get; set; }
        public string? MessagePath { get; set; }
    }

    public class SmsGatewayTemplateOptions
    {
        public List<SmsGatewayTemplate> SmsGatewayTemplates { get; set; } = new();
    }
}
