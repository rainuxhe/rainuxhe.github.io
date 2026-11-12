---
title: "Agent 技能"
description: "Agent 的***技能***是一个独立的功能单元，ADKAgent 可以使用它来执行特定任务。Agent 技能封装了执行任务所需的必要指令、资源和工具，基于"
icon: "article"
weight: 40
toc: true
---

支持版本：Python v1.25.0, Go v1.2.0。

Agent ***Skill*** 是一个自包含的功能单元，ADK Agent 可以使用它来执行特定任务。Agent Skill 封装了完成任务所需的指令、资源和工具，基于 [Agent Skill specification](https://agentskills.io/specification)。
Skill 的结构允许它增量加载，以最小化对 Agent 操作上下文窗口的影响。

{{% alert context="default" %}}
**在 TypeScript 和 Kotlin 中为实验性功能**

Skills 功能在 ADK TypeScript 和 ADK Kotlin 中是实验性的。我们欢迎您通过各自的 ADK 仓库提供反馈：[ADK TypeScript](https://github.com/google/adk-js/issues/new?template=feature_request.md&labels=skills), [ADK Kotlin](https://github.com/google/adk-kotlin/issues/new)。
{{% /alert %}}
## 入门 {#get-started}

使用 `SkillToolset` 类使一个或多个 Skills 可用于您的 Agent。您可以在代码中定义 [skills](#inline-skills)，或从文件系统加载 [skills](#filesystem-skills)。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
import pathlib

from google.adk import Agent
from google.adk.skills import load_skill_from_dir
from google.adk.tools import skill_toolset

weather_skill = load_skill_from_dir(
    pathlib.Path(__file__).parent / "skills" / "weather-skill"
)

def get_weather_tool(city: str) -> dict:
    """Retrieves the current weather report for a specified city."""
    return {
        "status": "success",
        "report": f"The weather in {city} is sunny with a temperature of 25°C.",
    }

my_skill_toolset = skill_toolset.SkillToolset(
    skills=[weather_skill],
    additional_tools=[get_weather_tool],
)

root_agent = Agent(
    model="gemini-flash-latest",
    name="skill_user_agent",
    description="An agent that can use specialized skills.",
    instruction=(
        "You are a helpful assistant that can leverage skills to perform tasks."
    ),
    tools=[
        my_skill_toolset,
    ],
)
```

有关带有技能的 ADK Agent 的完整代码示例，包括基于文件和内联技能定义，请参阅代码示例
[skills_agent](https://github.com/google/adk-python/tree/main/contributing/samples/environment_and_skills/skills_agent).
{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "context"
    "os"

    "google.golang.org/adk/v2/agent/llmagent"
    "google.golang.org/adk/v2/tool/skilltoolset/skill"
    "google.golang.org/adk/v2/tool/skilltoolset"
    "google.golang.org/adk/v2/tool"
)

mySkillToolset, err := skilltoolset.New(ctx, skilltoolset.Config{
    Source: skill.NewFileSystemSource(os.DirFS("./skills")),
})
if err != nil {
    // 处理错误
}

rootAgent, err := llmagent.New(llmagent.Config{
    Name:        "skill_user_agent",
    Model:       model,
    Description: "An agent that can use specialized skills.",
    Instruction: "You are a helpful assistant that can leverage skills to perform tasks.",
    Toolsets:    []tool.Toolset{mySkillToolset},
})
if err != nil {
    // 处理错误
}
```

完整示例请参见代码示例
[技能](https://github.com/google/adk-go/tree/main/examples/skills)。
{{% /tab %}}
{{< /tabs >}}
{{% alert context="info" %}}
**检查`skills/`的解决来源**

上述 Python 和 TypeScript 示例`skills/`相对于
目录里有 Agent 源文件，所以把`skills/`放在旁边
文件。Go 和 Kotlin 的例子传递一条相对 `skills` 路径，其中
而是相对于当前工作目录解析。
{{% /alert %}}
## 技能结构 {#skill-structure}

技能功能允许你创建技能指令的模块化包
以及 Agent 可以按需加载的资源。这种方法有助于组织
你 Agent 的能力，并通过仅加载上下文窗口来优化上下文窗口
需要时提供指示。技能的结构被组织为
三个层级：

- **L1（元数据）:** 提供技能发现的元数据。此信息
    定义在`SKILL.md`文件的前言部分，包含
    属性，比如技能名称和描述。
- **L2（指令）:** 包含该技能的主要指令，
    当技能被 Agent 触发时加载。这些信息被定义
    在`SKILL.md`档正文中。
- **L3（资源）:** 包含参考等额外资源
    材料、资源和脚本，可以根据需要加载。这些资源
    组织为以下目录：
    - `references/`：带有扩展指令的额外 Markdown 文件，
        工作流程或指导。
    - `assets/`：资源材料，如数据库模式、API
        文档、模板或示例。
    - `scripts/`：由 Agent 运行时支持的可执行脚本。

### 技能使用系统说明 {#system-instructions-for-using-skills}

`SkillToolset`向 Agent 提供默认的系统指令：
概述了它应如何与技能互动。这些说明包括
以下是关键点：

* 你必须先用`load_skill`工具阅读技能说明
    用它。
* 你必须严格按照技能定义中的指示操作。
* 你必须使用`load_skill_resource`工具查看技能内的文件
    目录。
* 你必须用`run_skill_script`来运行技能`scripts/`脚本
    目录。

### 技能验证 {#skill-validation}

技能`SKILL.md`文件的前言会被验证以确保
满足以下要求：

* **姓名**：
    * 必须不超过64个字符。
    * 必须小写，kebab-case（a-z，0-9，连字符）。
    * 不得有前导、后尾或连续连字符。
* ** 描述**：
    * 不能是空的。
    * 字符必须不超过1024个字符。{{% alert context="info" %}}
**目录必须与名称匹配**

从文件系统加载技能时，目录名称必须与前言中的 **name** 相匹配，否则加载将失败。
{{% /alert %}}
### 技能目录结构 {#skills-directory-structure}

以下目录结构显示了在 ADK Agent 项目中包含技能的推荐方式。下面显示的 `example-skill/` 目录，以及任何平行的技能目录，必须遵循 [Agent Skill specification](https://agentskills.io/specification) 文件结构。 仅 `SKILL.md` 文件是必需的。

```
my_agent/
    agent.py (or agent.ts / main.go)
    .env
    skills/
        example-skill/        # Skill
            SKILL.md          # main instructions (required)
            references/
                REFERENCE.md  # detailed API reference
                FORMS.md      # form-filling guide
                *.md          # domain-specific information
            assets/
                *.*           # templates, images, data
            scripts/
                *.py          # utility scripts (Python)
                *.js          # utility scripts (JavaScript)
                *.ts          # utility scripts (TypeScript)
```

## 技能来源 {#skill-sources}

您可以在代码中定义[技能](#inline-skills)，或从文件系统读取[技能](#filesystem-skills)。

### 在代码中定义技能 {#inline-skills}

您可以在 Agent 的代码中定义技能，如下所示。

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
from google.adk.skills import models

greeting_skill = models.Skill(
    frontmatter=models.Frontmatter(
        name="greeting-skill",
        description=(
            "A friendly greeting skill that can say hello to a specific person."
        ),
    ),
    instructions=(
        "Step 1: Read the 'references/hello_world.txt' file to understand how"
        " to greet the user. Step 2: Return a greeting based on the reference."
    ),
    resources=models.Resources(
        references={
            "hello_world.txt": "Hello! So glad to have you here!",
            "example.md": "This is an example reference.",
        },
    ),
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

{{% alert context="info" %}}
ADK Go 目前尚未提供用于内联技能的标准来源，
但未来可能会增加此功能。
要在代码中直接定义技能，您必须自己实现 `skill.Source`
接口，如下所示。
{{% /alert %}}

```go
import (
    "context"
    "io"
    "slices"
    "strings"

    "google.golang.org/adk/v2/tool/skilltoolset/skill"
)

// 静态内存技能的示例实现。来源：
type StaticSource struct{}

func (s *StaticSource) ListFrontmatters(ctx context.Context) ([]*skill.Frontmatter, error) {
    return []*skill.Frontmatter{
        {Name: "greeting-skill", Description: "A friendly greeting skill that can say hello to a specific person."},
    }, nil
}

func (s *StaticSource) LoadFrontmatter(ctx context.Context, name string) (*skill.Frontmatter, error) {
    if name != "greeting-skill" {
        return nil, skill.ErrSkillNotFound
    }
    return &skill.Frontmatter{Name: "greeting-skill", Description: "A friendly greeting skill that can say hello to a specific person."}, nil
}

func (s *StaticSource) LoadInstructions(ctx context.Context, name string) (string, error) {
    if name != "greeting-skill" {
        return "", skill.ErrSkillNotFound
    }
    return "Step 1: Read the 'references/hello_world.txt' file to understand how to greet the user. Step 2: Return a greeting based on the reference.", nil
}

func (s *StaticSource) ListResources(ctx context.Context, name, subpath string) ([]string, error) {
    if name != "greeting-skill" {
        return nil, skill.ErrSkillNotFound
    }
    if !slices.Contains([]string{"", ".", "references", "references/"}, subpath) {
        return nil, skill.ErrResourceNotFound
    }
    return []string{"references/hello_world.txt", "references/example.md"}, nil
}

func (s *StaticSource) LoadResource(ctx context.Context, name, resourcePath string) (io.ReadCloser, error) {
    if name != "greeting-skill" {
        return nil, skill.ErrSkillNotFound
    }
    switch resourcePath {
    case "references/hello_world.txt":
        return io.NopCloser(strings.NewReader("Hello! So glad to have you here!")), nil
    case "references/example.md":
        return io.NopCloser(strings.NewReader("This is an example reference.")), nil
    default:
        return nil, skill.ErrResourceNotFound
    }
}
```

{{% /tab %}}
{{< /tabs >}}
{{% alert context="info" %}}
`Source` 接口可以由任何数据存储（例如数据库）支持，以支持动态用例，如实时更新和个性化。
{{% /alert %}}
### 从文件系统读取技能 {#filesystem-skills}

{{< tabs tabTotal="2" >}}
{{% tab tabName="Python" %}}

```python
import pathlib

from google.adk.skills import load_skill_from_dir
from google.adk.tools import skill_toolset

greeting_skill = load_skill_from_dir(
    pathlib.Path(__file__).parent / "skills" / "greeting-skill"
)
weather_skill = load_skill_from_dir(
    pathlib.Path(__file__).parent / "skills" / "weather-skill"
)

my_skill_toolset = skill_toolset.SkillToolset(
    skills=[weather_skill, greeting_skill],
)
```

{{% /tab %}}
{{% tab tabName="Go" %}}

```go
import (
    "os"

    "google.golang.org/adk/v2/tool/skilltoolset/skill"
    "google.golang.org/adk/v2/tool/skilltoolset"
)

// ...

source := skill.NewFileSystemSource(os.DirFS("./skills"))

// 这个示例没有使用任何可选的包装器，但你可以使用它们，如果
// 例如，需要：
//   source, _, err = skill.WithFrontmatterPreloadSource(ctx, source)
//   source, _, err = skill.WithCompletePreloadSource(ctx, source)
// 有关这些和其他封装器的更多信息，请参阅
// https://pkg.go.dev/google.golang.org/adk/v2/tool/skilltoolset/skill#Source.

skillToolset, err := skilltoolset.New(ctx, skilltoolset.Config{
    Source: source,
})
if err != nil {
    // 处理错误
}
```

{{% /tab %}}
{{< /tabs >}}
## 技能处理与验证 {#skill-processing-and-validation}

当你在 Agent 中包含技能时，Agent 会使用标准化流程与它们进行交互。该流程包括系统级指令（用于指导如何使用技能）、技能表示的定义格式，以及技能定义的验证规则。

## 后续步骤 {#next-steps}

查看这些用于构建具有技能 Agent 的资源：

- [Python 中的技能 - 代码示例](https://github.com/google/adk-python/tree/main/contributing/samples/environment_and_skills/skills_agent)
- [Go 中的技能 - 代码示例](https://github.com/google/adk-go/tree/main/examples/skills)
- [Kotlin 中的技能 - 代码示例](https://github.com/google/adk-kotlin/tree/main/examples/src/main/kotlin/com/google/adk/kt/examples/skills)
- Agent 技能 [规范文档](https://agentskills.io/)

---

原文：[Skills for ADK agents](https://adk.dev/skills/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/skills/index.md)
